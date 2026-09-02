import { getGemini, GEMINI_MODEL, GEMINI_FALLBACK_MODELS, hasGeminiKey, SYSTEM_PROMPT } from "@/app/lib/gemini";
import { retrieveTopSchemes } from "@/app/lib/embeddings";
import { checkRateLimit, getClientIp } from "@/app/lib/auth";
import { z } from "zod";

export async function GET() {
  return new Response(JSON.stringify({ success: true, model: GEMINI_MODEL, hasKey: hasGeminiKey(), retrieval: "RAG top-8 via text-embedding-004", endpoint: "POST /api/ai/chat/stream {message, language} SSE stream" }), { headers: { "Content-Type": "application/json" } });
}

const schema = z.object({
  message: z.string().min(1).max(4000),
  language: z.string().min(2).max(10).default("en"),
  history: z.array(z.object({ role: z.enum(["user","model"]), text: z.string().max(4000) })).max(20).optional(),
  income: z.number().optional(),
  state: z.string().optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`ai_stream:${ip}`, 15, 60*1000)) {
    return new Response(JSON.stringify({ error:"Too many requests"}), { status:429, headers:{ "Content-Type":"application/json"}});
  }
  const body = await request.json().catch(()=>null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.issues[0].message}), { status:400, headers:{ "Content-Type":"application/json"}});
    const { message, history, income, state } = parsed.data;
    const language = "en";

  if (!hasGeminiKey()) {
    // SSE demo fallback: stream the rule-based answer word by word — English only
    const demoText = `Searching schemes for "${message}" (Demo — add GEMINI_API_KEY for live Gemini 2.5 streaming)`;
    const words = demoText.split(" ");
    const stream = new ReadableStream({
      async start(controller){
        const enc = new TextEncoder();
        for (const w of words){ controller.enqueue(enc.encode(`data: ${JSON.stringify({ token: w+" "})}\n\n`)); await new Promise(r=>setTimeout(r, 60)); }
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ done:true, model:"demo"})}\n\n`));
        controller.close();
      }
    });
    return new Response(stream, { headers:{ "Content-Type":"text/event-stream", "Cache-Control":"no-cache", "Connection":"keep-alive" }});
  }

  // RAG: top 8 relevant schemes only
  const top = await retrieveTopSchemes(message, 8);
  const grounded = top.map(t=>t.scheme);
  const ctx = grounded.map((s:any)=> `ID:${s.id} | ${s.name} | cat:${s.category} | max_income:${s.eligibility?.max_income ?? "NA"} | desc:${s.description} | docs:${s.documents_required?.join("; ")}`).join("\n");

  const genAI = getGemini()!;
  const chatHist = [
    { role:"user" as const, parts:[{ text:`User profile: lang=${language} income=${income??"?"} state=${state??"?"}\nGrounded top ${grounded.length} schemes (cite schemeId only from these):\n${ctx}` }] },
    { role:"model" as const, parts:[{ text:"Ready. I will cite only provided schemeIds." }] },
    ...(history||[]).map(h=> ({ role:h.role as "user"|"model", parts:[{ text:h.text }]})),
  ];

  let result: any = null;
  let usedModel = GEMINI_MODEL;
  let lastErr: any = null;
  for (const m of GEMINI_FALLBACK_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: m, systemInstruction: SYSTEM_PROMPT });
      const chat = model.startChat({ history: chatHist, generationConfig:{ temperature:0.4, maxOutputTokens: 1000 } });
      result = await chat.sendMessageStream(`${message}\nReply in ENGLISH only — also return JSON {answer (English), recommendations:[{schemeId,score,reason}]}`);
      usedModel = m;
      break;
    } catch (e: any) {
      lastErr = e;
      const msg = e?.message || String(e);
      if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) throw e;
      continue;
    }
  }
  if (!result) {
    const msg = lastErr?.message || "Model fallback failed";
    const demoText = `Fallback grounded demo for "${message}" — ` + grounded.slice(0,2).map((s:any)=> s.name).join(", ");
    const words = demoText.split(" ");
    const stream = new ReadableStream({
      async start(controller){
        const enc = new TextEncoder();
        for (const w of words){ controller.enqueue(enc.encode(`data: ${JSON.stringify({ token: w+" "})}\n\n`)); await new Promise(r=>setTimeout(r, 40)); }
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ done:true, model:"demo-fallback", warning: msg.slice(0,200) })}\n\n`));
        controller.close();
      }
    });
    return new Response(stream, { headers:{ "Content-Type":"text/event-stream", "Cache-Control":"no-cache", "Connection":"keep-alive" }});
  }

  const stream = new ReadableStream({
    async start(controller){
      const enc = new TextEncoder();
      try{
        for await (const chunk of result.stream){
          const text = chunk.text();
          if (text) controller.enqueue(enc.encode(`data: ${JSON.stringify({ token:text})}\n\n`));
        }
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ done:true, sources: grounded.map((s:any)=> s.id), model: usedModel })}\n\n`));
      }catch(e: any){
        const msg = e?.message || String(e);
        let hint = "Check GEMINI_API_KEY at https://aistudio.google.com/app/apikey — verify: GET /api/ai/verify";
        if (msg.includes("API_KEY")) hint = "Invalid key — regenerate at aistudio.google.com/app/apikey";
        else if (msg.includes("quota") || msg.includes("429")) hint = "Quota exceeded — wait 60s";
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: msg.slice(0,400), hint })}\n\n`));
      }
      controller.close();
    }
  });

  return new Response(stream, { headers:{ "Content-Type":"text/event-stream", "Cache-Control":"no-cache", "Connection":"keep-alive" }});
}
