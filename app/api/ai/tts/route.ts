import { getGemini, hasGeminiKey, GEMINI_MODEL } from "@/app/lib/gemini";
import { checkRateLimit, getClientIp } from "@/app/lib/auth";
import { z } from "zod";

const schema = z.object({
  text: z.string().min(1).max(2000),
  lang: z.string().min(2).max(10).default("en"),
  voice: z.string().max(30).optional(),
});

// POST /api/ai/tts — server TTS via Gemini (fallback: echo text for client speechSynthesis)
export async function POST(request: Request){
  const ip = getClientIp(request);
  if (!checkRateLimit(`tts:${ip}`, 20, 60*1000)) return new Response(JSON.stringify({ success:false, error:"Too many"}), { status:429, headers:{ "Content-Type":"application/json"}});
  const body = await request.json().catch(()=>null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response(JSON.stringify({ success:false, error: parsed.error.issues[0].message}), { status:400, headers:{ "Content-Type":"application/json"}});
  const { text, lang } = parsed.data;

  if (!hasGeminiKey()){
    return new Response(JSON.stringify({ success:true, demoMode:true, note:"Client-side speechSynthesis fallback — add GEMINI_API_KEY for server TTS", text, lang, model:"client-fallback" }), { headers:{ "Content-Type":"application/json"}});
  }
  // Note: Gemini 2.5 TTS preview requires @google/genai new SDK. For broad compatibility, we return text + hint for client TTS.
  // If @google/genai TTS is enabled, uncomment below to generate audio/mpeg.
  try{
    // Future: const genAI = getGeminiNew(); const audio = await genAI... generate speech
    // For now, use Gemini to normalize text for TTS (expand abbreviations, add SSML pauses)
    const { getGemini } = await import("@/app/lib/gemini");
    const genAI = getGemini()!;
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const r = await model.generateContent(`Rewrite for TTS in ${lang}: add natural pauses, expand ₹ to rupees, keep Hindi transliteration if ${lang}==hi. Text: """${text}""" Return only rewritten text.`);
    const ttsText = r.response.text().trim();
    return new Response(JSON.stringify({ success:true, ttsText, original:text, lang, model: GEMINI_MODEL, playback:"client speechSynthesis with ttsText" }), { headers:{ "Content-Type":"application/json"}});
  }catch(e){
    return new Response(JSON.stringify({ success:false, error:(e as Error).message}), { status:500, headers:{ "Content-Type":"application/json"}});
  }
}
export async function GET(){
  return new Response(JSON.stringify({ success:true, model: GEMINI_MODEL, hasKey:hasGeminiKey(), endpoint:"POST /api/ai/tts {text, lang}" }), { headers:{ "Content-Type":"application/json"}});
}
