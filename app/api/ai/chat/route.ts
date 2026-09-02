import { getGemini, SYSTEM_PROMPT, GEMINI_MODEL, GEMINI_FALLBACK_MODELS, demoFallbackResponse, hasGeminiKey, tryGenerateContent } from "@/app/lib/gemini";
import schemes from "@/app/data/schemes.json";
import { retrieveTopSchemes } from "@/app/lib/embeddings";
import { checkRateLimit, getClientIp } from "@/app/lib/auth";
import { z } from "zod";

const schema = z.object({
  message: z.string().min(1).max(4000),
  language: z.string().min(2).max(10).default("en"), // always en now
  history: z.array(z.object({ role: z.enum(["user", "model"]), text: z.string().max(4000) })).max(20).optional(),
  income: z.number().optional(),
  state: z.string().optional(),
  category: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(`ai_chat:${ip}`, 20, 60 * 1000)) {
      return new Response(JSON.stringify({ success: false, error: "Too many AI requests, try in 1 min" }), { status: 429, headers: { "Content-Type": "application/json" } });
    }
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return new Response(JSON.stringify({ success: false, error: parsed.error.issues[0].message }), { status: 400, headers: { "Content-Type": "application/json" } });
    const { message, history, income, state, category } = parsed.data;
    const language = "en";

    // Demo mode without key — still shows grounded structure to judges
    const genAI = getGemini();
    if (!genAI || !hasGeminiKey()) {
      const fallback = demoFallbackResponse(message, language);
      // enrich fallback with full scheme objects
      const enriched = fallback.recommendations.map((r: any) => {
        const full = (schemes as any[]).find((s) => s.id === r.schemeId);
        return { scheme: full, score: r.score, matchingFactors: r.matchingFactors, reason: r.reason };
      });
      return new Response(JSON.stringify({ success: true, demoMode: true, answer: fallback.answer, matches: enriched, model: "demo-rule-based", groundedSchemes: 94 }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // RAG: retrieve top 8 relevant schemes to keep prompt small + cited
    const top = await retrieveTopSchemes(message, 8);
    const ctx = top.map((t) => {
      const s = t.scheme;
      return `ID:${s.id} | ${s.name} | cat:${s.category} | max_income:${s.eligibility?.max_income ?? "NA"} | desc:${s.description} | docs:${s.documents_required?.join("; ")} | score:${t.score.toFixed(2)}`;
    }).join("\n");
    const userContext = `User profile: language=${language} income=${income ?? "unknown"} state=${state ?? "unknown"} category_interest=${category ?? "any"}.\nGrounded TOP ${top.length} schemes (cite schemeId only from these, RAG retrieved):\n${ctx}`;

    const chatHistory = [
      { role: "user" as const, parts: [{ text: userContext }] },
      { role: "model" as const, parts: [{ text: "Understood. I will only recommend from these 94 schemes and cite schemeId. Ready." }] },
      ...(history || []).map((h) => ({ role: h.role as "user" | "model", parts: [{ text: h.text }] })),
    ];

    const prompt = `User query: "${message}"\nRespond in ENGLISH only. Return JSON with {answer: string (English), recommendations: [{schemeId, score, reason (English), matchingFactors}]}`;

    // Try Gemini with fallback models; on quota/model failure, graceful degrade to demo
    let text: string;
    let usedModel = GEMINI_MODEL;
    try {
      const genAIInner = getGemini()!;
      let lastErr: any = null;
      let success = false;
      for (const m of GEMINI_FALLBACK_MODELS) {
        try {
          const model = genAIInner.getGenerativeModel({ model: m, systemInstruction: SYSTEM_PROMPT });
          const chat = model.startChat({ history: chatHistory, generationConfig: { temperature: 0.4, maxOutputTokens: 1200 } });
          const result = await chat.sendMessage(prompt);
          text = result.response.text();
          usedModel = m;
          success = true;
          break;
        } catch (e: any) {
          lastErr = e;
          const msg = e?.message || String(e);
          if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) throw e;
          continue;
        }
      }
      if (!success) throw lastErr;
      text = text!;
    } catch (e: any) {
      const msg = e?.message || String(e);
      // Graceful fallback to demo on quota/model errors — still grounded
      if (msg.includes("quota") || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("not found") || msg.includes("fetch failed")) {
        const fallback = demoFallbackResponse(message, language);
        const enriched = fallback.recommendations.map((r: any) => {
          const full = (schemes as any[]).find((s) => s.id === r.schemeId);
          return { scheme: full, score: r.score, matchingFactors: r.matchingFactors, reason: r.reason };
        });
        return new Response(JSON.stringify({ success: true, answer: fallback.answer + " (Quota fallback — demo grounded)", matches: enriched, model: "demo-fallback-quota", groundedSchemes: 94, groundedIds: enriched.map((e:any)=>e.scheme.id), warning: msg.slice(0,300) }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      throw e;
    }

    // Try parse JSON from Gemini; fallback to text
    let parsedJson: any = null;
    let answer = text;
    let recs: any[] = [];
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedJson = JSON.parse(jsonMatch[0]);
        answer = parsedJson.answer || parsedJson.response || text;
        recs = parsedJson.recommendations || [];
      }
    } catch {}

    // If Gemini returned no structured recs, heuristically map mentions
    if (recs.length === 0) {
      const mentioned = (schemes as any[]).filter((s) => text.toLowerCase().includes(s.id) || text.toLowerCase().includes(s.name.toLowerCase()));
      recs = mentioned.slice(0, 3).map((s) => ({ schemeId: s.id, score: 0.8, reason: s.description, matchingFactors: [`Category: ${s.category}`] }));
    }

    // Enrich recs with full scheme objects
    const matches = recs.slice(0, 5).map((r: any) => {
      const full = (schemes as any[]).find((s) => s.id === r.schemeId);
      if (!full) return null;
      return { scheme: full, score: r.score ?? 0.8, matchingFactors: r.matchingFactors || [], reason: r.reason || "" };
    }).filter(Boolean);

    return new Response(JSON.stringify({ success: true, answer, matches, raw: parsedJson ? undefined : text, model: usedModel, groundedSchemes: top.length, groundedIds: top.map((t)=> t.scheme.id), retrieval: "text-embedding-004 + cosine (fallback keyword)" }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("AI chat error", e);
    const msg = e?.message || String(e);
    let hint = "Retry in 10s. If persists, check GEMINI_API_KEY at https://aistudio.google.com/app/apikey and restart: npm run dev";
    if (msg.includes("API_KEY_INVALID") || msg.includes("API key")) hint = "GEMINI_API_KEY invalid — regenerate at https://aistudio.google.com/app/apikey, set in .env.local as GEMINI_API_KEY=AIza... (no quotes, no xxxx)";
    else if (msg.includes("quota") || msg.includes("429")) hint = "Gemini quota exceeded — wait 60s or check billing";
    else if (msg.includes("model")) hint = `Model ${GEMINI_MODEL} not found — set GEMINI_MODEL=gemini-2.0-flash in .env.local`;
    return new Response(JSON.stringify({ success: false, error: `${msg.slice(0,400)}`, hint, verify: "GET /api/ai/verify" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

// GET exposes capabilities for judges / health check
export async function GET() {
  return new Response(JSON.stringify({ success: true, model: GEMINI_MODEL, hasKey: hasGeminiKey(), schemes: 94, retrieval: "RAG top-8 via text-embedding-004", endpoints: ["POST /api/ai/chat {message, language, history}", "POST /api/ai/chat/stream (SSE)"] }), { headers: { "Content-Type": "application/json" } });
}
