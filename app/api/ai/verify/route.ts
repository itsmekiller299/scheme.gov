import { getGemini, GEMINI_MODEL, getKeyDiagnostics, hasGeminiKey } from "@/app/lib/gemini";

export async function GET() {
  const diag = getKeyDiagnostics();
  if (!diag.hasKey) {
    const { hasKey, ...rest } = diag as any;
    return new Response(JSON.stringify({ success: false, live: false, hasKey: false, model: GEMINI_MODEL, ...rest, fix: "Edit .env.local: replace GEMINI_API_KEY=AIza-xxxx with real key from https://aistudio.google.com/app/apikey then restart: npm run dev" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  // Try minimal live call
  try {
    const genAI = getGemini()!;
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const r = await model.generateContent("Reply with single word: ok");
    const text = r.response.text().trim().slice(0, 20);
    return new Response(JSON.stringify({ success: true, live: true, hasKey: true, model: GEMINI_MODEL, keyPrefix: diag.keyPrefix, verifyText: text, message: "Live Gemini unlock verified — chat/stream/analyze will use real Gemini." }), { headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    const msg = e?.message || String(e);
    let reason = msg;
    let fix = "Check key at https://aistudio.google.com/app/apikey";
    if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) { reason = "API_KEY_INVALID"; fix = "Key invalid — regenerate at aistudio.google.com/app/apikey and update .env.local GEMINI_API_KEY (must start with AIza, 39 chars)."; }
    else if (msg.includes("quota") || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) { reason = "QUOTA_EXCEEDED"; fix = "Quota exceeded — check billing at aistudio.google.com or wait 60s."; }
    else if (msg.includes("model") && msg.includes("not found")) { reason = "MODEL_NOT_FOUND"; fix = `Model ${GEMINI_MODEL} not found — set GEMINI_MODEL=gemini-2.0-flash in .env.local`; }
    return new Response(JSON.stringify({ success: false, live: false, hasKey: true, model: GEMINI_MODEL, keyPrefix: diag.keyPrefix, error: reason, raw: msg.slice(0, 500), fix }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
}

export async function POST() { return GET(); }
