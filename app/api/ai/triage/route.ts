import { getGemini, GEMINI_MODEL, hasGeminiKey } from "@/app/lib/gemini";
import { checkRateLimit, getClientIp } from "@/app/lib/auth";
import { z } from "zod";

const schema = z.object({
  subject: z.string().min(2).max(200),
  description: z.string().min(5).max(4000),
  language: z.string().min(2).max(10).default("en"),
  category: z.string().max(50).optional(),
  schemeId: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`triage:${ip}`, 20, 60*1000)) return new Response(JSON.stringify({ success:false, error:"Too many"}), { status:429, headers:{ "Content-Type":"application/json"}});
  const body = await request.json().catch(()=>null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response(JSON.stringify({ success:false, error: parsed.error.issues[0].message}), { status:400, headers:{ "Content-Type":"application/json"}});
  const { subject, description, language, category, schemeId } = parsed.data;

  if (!hasGeminiKey()) {
    // heuristic fallback
    const text = `${subject} ${description}`.toLowerCase();
    let urgency: string = "medium";
    if (text.includes("urgent") || text.includes("not working") || text.includes("rejected")) urgency="high";
    if (text.includes("thank") || text.includes("info")) urgency="low";
    const lang = /[\u0900-\u097F]/.test(description) ? "hi" : language;
    return new Response(JSON.stringify({ success:true, demoMode:true, triage:{ urgency, sentiment: urgency==="high"?"negative":"neutral", lang, category: category||"general", suggestedSchemeId: schemeId||null, draftReply: `Thanks for contacting us about "${subject}". Our team will review (demo).` }, model:"rule-based"}), { headers:{ "Content-Type":"application/json"}});
  }

  const genAI = getGemini()!;
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const prompt = `You are support triage AI for scheme.gov (94 welfare schemes). Ticket: subject="${subject}" description="${description}" category=${category||"?"} schemeId=${schemeId||"?"}. Language hint: ${language}.
Return JSON only: {urgency: "low"|"medium"|"high", sentiment:"positive"|"neutral"|"negative", lang:"en"|"hi"|"ta"|"te"|"bn"|"mr"|..., category:"general"|"scheme"|"handloom"|"technical"|"documents", suggestedSchemeId: string|null, draftReply: string (in ticket language, <=90 words, warm, actionable, cite next step /apply/<id> if relevant), tags: string[] }`;

  try{
    const r = await model.generateContent(prompt);
    const txt = r.response.text();
    const j = JSON.parse(txt.match(/\{[\s\S]*\}/)?.[0] || "{}");
    return new Response(JSON.stringify({ success:true, triage: j, model: GEMINI_MODEL }), { headers:{ "Content-Type":"application/json"}});
  }catch(e){
    return new Response(JSON.stringify({ success:false, error:(e as Error).message}), { status:500, headers:{ "Content-Type":"application/json"}});
  }
}

export async function GET(){
  return new Response(JSON.stringify({ success:true, model: GEMINI_MODEL, hasKey: hasGeminiKey(), endpoint:"POST /api/ai/triage {subject, description, language}"}), { headers:{ "Content-Type":"application/json"}});
}
