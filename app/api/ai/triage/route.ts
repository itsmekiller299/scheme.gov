import { GEMINI_MODEL, GEMINI_FALLBACK_MODELS, hasGeminiKey, tryGenerateContent } from "@/app/lib/gemini";
import { checkRateLimit, getClientIp } from "@/app/lib/auth";
import { z } from "zod";

function heuristicFallback(subject:string, description:string, language:string, category?:string, schemeId?:string){
  const text = `${subject} ${description}`.toLowerCase();
  let urgency: string = "medium";
  if (text.includes("urgent") || text.includes("not working") || text.includes("rejected") || text.includes("delayed")) urgency="high";
  if (text.includes("thank") || text.includes("info")) urgency="low";
  return { urgency, sentiment: urgency==="high"?"negative":"neutral", lang: language, category: category||"general", suggestedSchemeId: schemeId||null, draftReply: `Thanks for contacting us about "${subject}". Our team will review shortly and guide next steps at /apply/${schemeId||"help"} (demo fallback — Gemini quota high demand, retry soon).`, tags: ["auto-triaged"] };
}

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
    return new Response(JSON.stringify({ success:true, demoMode:true, triage: heuristicFallback(subject, description, language, category, schemeId), model:"rule-based"}), { headers:{ "Content-Type":"application/json"}});
  }

  const prompt = `You are support triage AI for scheme.gov (94 welfare schemes). Ticket: subject="${subject}" description="${description}" category=${category||"?"} schemeId=${schemeId||"?"}. Language hint: ${language}.
Return JSON only: {urgency: "low"|"medium"|"high", sentiment:"positive"|"neutral"|"negative", lang:"en"|"hi"|"ta"|"te"|"bn"|"mr"|..., category:"general"|"scheme"|"handloom"|"technical"|"documents", suggestedSchemeId: string|null, draftReply: string (in ticket language, <=90 words, warm, actionable, cite next step /apply/<id> if relevant), tags: string[] }`;

  try{
    const { text: txt, model: used } = await tryGenerateContent(prompt);
    const j = JSON.parse(txt.match(/\{[\s\S]*\}/)?.[0] || "{}");
    return new Response(JSON.stringify({ success:true, triage: j, model: used }), { headers:{ "Content-Type":"application/json"}});
  }catch(e: any){
    const msg = e?.message || String(e);
    if (msg.includes("quota") || msg.includes("429") || msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("RESOURCE_EXHAUSTED")) {
      return new Response(JSON.stringify({ success:true, demoMode:true, triage: heuristicFallback(subject, description, language, category, schemeId), model:"demo-fallback-quota", warning: msg.slice(0,300)}), { headers:{ "Content-Type":"application/json"}});
    }
    return new Response(JSON.stringify({ success:false, error: msg.slice(0,400)}), { status:500, headers:{ "Content-Type":"application/json"}});
  }
}

export async function GET(){
  return new Response(JSON.stringify({ success:true, model: GEMINI_MODEL, hasKey: hasGeminiKey(), endpoint:"POST /api/ai/triage {subject, description, language}"}), { headers:{ "Content-Type":"application/json"}});
}
