import { getGemini, GEMINI_MODEL, hasGeminiKey } from "@/app/lib/gemini";
import { checkRateLimit, getClientIp } from "@/app/lib/auth";
import { z } from "zod";

const schema = z.object({
  text: z.string().min(1).max(4000),
  targetLang: z.string().min(2).max(10), // en, hi, ta, te, bn, mr, gu, kn, ml, pa, or, as
  sourceLang: z.string().max(10).optional(),
});

export async function POST(request: Request){
  const ip = getClientIp(request);
  if (!checkRateLimit(`translate:${ip}`, 30, 60*1000)) return new Response(JSON.stringify({ success:false, error:"Too many"}), { status:429, headers:{ "Content-Type":"application/json"}});
  const body = await request.json().catch(()=>null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response(JSON.stringify({ success:false, error: parsed.error.issues[0].message}), { status:400, headers:{ "Content-Type":"application/json"}});
  const { text, targetLang, sourceLang } = parsed.data;
  const langNames: Record<string,string> = { en:"English", hi:"Hindi", ta:"Tamil", te:"Telugu", bn:"Bengali", mr:"Marathi", gu:"Gujarati", kn:"Kannada", ml:"Malayalam", pa:"Punjabi", or:"Odia", as:"Assamese" };
  const target = langNames[targetLang] || targetLang;

  if (!hasGeminiKey()){
    // fallback: just echo with note
    return new Response(JSON.stringify({ success:true, demoMode:true, translated: `[Demo ${target} translation — add GEMINI_API_KEY] `+text, targetLang, model:"rule-based" }), { headers:{ "Content-Type":"application/json"}});
  }
  const genAI = getGemini()!;
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const prompt = `Translate the following ${sourceLang?`from ${sourceLang} `: ""}to ${target}. Keep gov scheme names (PM-KISAN, MGNREGA, etc.) in English. Preserve tone. Return only translation, no explanation. Text: """${text}"""`;
  try{
    const r = await model.generateContent(prompt);
    const translated = r.response.text().trim();
    return new Response(JSON.stringify({ success:true, translated, targetLang, model: GEMINI_MODEL }), { headers:{ "Content-Type":"application/json"}});
  }catch(e){
    return new Response(JSON.stringify({ success:false, error:(e as Error).message}), { status:500, headers:{ "Content-Type":"application/json"}});
  }
}
export async function GET(){
  return new Response(JSON.stringify({ success:true, model: GEMINI_MODEL, hasKey:hasGeminiKey(), endpoint:"POST /api/ai/translate {text, targetLang}" }), { headers:{ "Content-Type":"application/json"}});
}
