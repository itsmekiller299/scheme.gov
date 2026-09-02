import { GEMINI_MODEL, GEMINI_FALLBACK_MODELS, getKeyDiagnostics, hasGeminiKey, tryGenerateContent } from "@/app/lib/gemini";

export async function GET() {
  const diag = getKeyDiagnostics();
  if (!diag.hasKey) {
    const { hasKey, ...rest } = diag as any;
    return new Response(JSON.stringify({ success: false, live: false, hasKey: false, model: GEMINI_MODEL, tried: GEMINI_FALLBACK_MODELS, ...rest, fix: "Edit .env.local: replace GEMINI_API_KEY=AIza-xxxx with real key from https://aistudio.google.com/app/apikey then restart: npm run dev" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  // Try minimal live call with fallback models
  try {
    const { text, model } = await tryGenerateContent("Reply with single word: ok");
    return new Response(JSON.stringify({ success: true, live: true, hasKey: true, model, tried: GEMINI_FALLBACK_MODELS, keyPrefix: diag.keyPrefix, verifyText: text.trim().slice(0,20), message: "Live Gemini unlock verified — chat/stream/analyze will use real Gemini." }), { headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    const msg = e?.message || String(e);
    let reason = msg;
    let fix = "Check key at https://aistudio.google.com/app/apikey";
    if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) { reason = "API_KEY_INVALID"; fix = "Key invalid — regenerate at aistudio.google.com/app/apikey and update .env.local GEMINI_API_KEY (must start with AIza, 39 chars)."; }
    else if (msg.includes("401") || msg.includes("UNAUTHENTICATED") || msg.includes("ACCESS_TOKEN")) { reason = "AUTH_401_AQ_KEY"; fix = "AQ. keys are OAuth/IP-bound and fail on Vercel (401). Generate fresh AIza key at aistudio.google.com/app/apikey (starts with AIza, 39 chars) and set: vercel env add GEMINI_API_KEY production → vercel --prod --yes. Demo fallback still works."; }
    else if (msg.includes("quota") || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) { reason = "QUOTA_EXCEEDED"; fix = "Quota exceeded — check billing at aistudio.google.com or wait 60s. Demo mode will still work (rule-based fallback)."; }
    else if (msg.includes("model") && msg.includes("not found")) { reason = "MODEL_NOT_FOUND"; fix = `Models tried ${GEMINI_FALLBACK_MODELS.join(", ")} not found — set GEMINI_MODEL=gemini-flash-latest in .env.local`; }
    return new Response(JSON.stringify({ success: false, live: false, hasKey: true, model: GEMINI_MODEL, tried: GEMINI_FALLBACK_MODELS, keyPrefix: diag.keyPrefix, error: reason, raw: msg.slice(0, 500), fix }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
}

export async function POST() { return GET(); }
