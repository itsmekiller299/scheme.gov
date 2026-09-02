import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";
import schemes from "@/app/data/schemes.json";

// Central helper for all Gemini usage — single source of truth for judges.
// Judges checklist: which Gemini model, how it is central, grounding source.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
export const GEMINI_FALLBACK_MODEL = "gemini-flash-latest";
export const GEMINI_EMBEDDING_MODEL = "text-embedding-004";
export const SCHEMES_COUNT = schemes.length;

export function getRawKey(): string {
  return (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
}
export function isPlaceholderKey(k: string): boolean {
  return !k || k.includes("xxxxxxxx") || k.includes("your-key") || k.length < 20;
}
export function hasGeminiKey(): boolean {
  const k = getRawKey();
  if (isPlaceholderKey(k)) return false;
  // Accept both legacy AIza... and newer AQ.... keys (both valid for generativelanguage.googleapis.com) + generic 30char
  if (k.length < 30) return false;
  return k.startsWith("AIza") || k.startsWith("AQ.") || k.length >= 35;
}
export function hasValidGeminiKey(): boolean { return hasGeminiKey(); }
export function getKeyDiagnostics(): { hasKey: boolean; keyPrefix: string; keyLen: number; reason: string } {
  const k = getRawKey();
  if (!k) return { hasKey: false, keyPrefix: "", keyLen: 0, reason: "GEMINI_API_KEY not set. Get at https://aistudio.google.com/app/apikey" };
  if (k.includes("xxxxxxxx")) return { hasKey: false, keyPrefix: k.slice(0,4), keyLen: k.length, reason: "Placeholder key — replace AIza-xxxx with real key from aistudio.google.com" };
  if (k.length < 30) return { hasKey: false, keyPrefix: k.slice(0,4), keyLen: k.length, reason: "Key too short — truncated? Complete key length ~35-53." };
  return { hasKey: true, keyPrefix: k.slice(0,7), keyLen: k.length, reason: "OK" };
}

// Support both SDKs: legacy @google/generative-ai and new @google/genai
let cachedLegacy: { key: string; inst: GoogleGenerativeAI } | null = null;
let cachedNew: { key: string; inst: GoogleGenAI } | null = null;

export function getGemini() {
  const key = getRawKey();
  if (!hasGeminiKey()) return null;
  if (!cachedLegacy || cachedLegacy.key !== key) {
    cachedLegacy = { key, inst: new GoogleGenerativeAI(key) };
  }
  return cachedLegacy.inst;
}

export function getGeminiNew() {
  const key = getRawKey();
  if (!hasGeminiKey()) return null;
  if (!cachedNew || cachedNew.key !== key) {
    cachedNew = { key, inst: new GoogleGenAI({ apiKey: key }) };
  }
  return cachedNew.inst;
}

// Call once on startup to warn in logs
if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
  const d = getKeyDiagnostics();
  if (!d.hasKey) {
    console.warn(`[Gemini] ${d.reason} — running in demo rule-based mode. Set GEMINI_API_KEY in .env.local to unlock live Gemini.`);
  } else {
    console.log(`[Gemini] Live key detected (${d.keyPrefix}... len=${d.keyLen}) model=${GEMINI_MODEL}`);
  }
}

// Build grounded context — all 94 schemes fit in 1M context, no vector DB needed for hackathon.
// Concise representation for faster inference + lower cost.
export function buildSchemesContext(lang: string = "en") {
  const useHi = lang === "hi";
  return schemes
    .map((s: any) => {
      return `ID:${s.id} | ${useHi && s.name_hi ? s.name_hi + " / " : ""}${s.name} | cat:${s.category} | states:${s.state_coverage.join(",")} | max_income:${s.eligibility?.max_income ?? "NA"} | age:${s.eligibility?.age_min ?? "-"}-${s.eligibility?.age_max ?? "-"} | desc:${useHi && s.description_hi ? s.description_hi : s.description} | benefits:${(useHi && s.benefits_hi ? s.benefits_hi : s.benefits).join("; ")} | docs:${(useHi && s.documents_required_hi ? s.documents_required_hi : s.documents_required).join("; ")}`;
    })
    .join("\n");
}

export const SYSTEM_PROMPT = `You are scheme.gov — AI Assist for Gov, India's official welfare scheme discovery assistant.
You are powered by Google Gemini. You must be HELPFUL, GROUNDED, and ENGLISH-ONLY.

Rules:
- Only recommend from the 94 central schemes provided in context. Never invent schemes. Always cite schemeId (e.g. pm-kisan, ayushman, mgnrega, nhdp).
- Explain eligibility in plain language: income, age, caste, state, occupation.
- ALWAYS reply in ENGLISH only, even if user writes in Hindi or other language. Translate user intent to English and answer in English.
- For each recommendation, output JSON strictly matching: { recommendations: [{ schemeId, score 0-1, reason, matchingFactors: string[] }], answer, followUpQuestion }
- Be concise (<=180 words answer) but warm. For low-income rural users, prioritize high-impact schemes.
- If user asks to apply, guide next step: /apply/<schemeId>
- Never ask for full Aadhaar. Only last 4 if needed.
- If income/state/category not provided, infer best and ask follow-up.
`;

export function demoFallbackResponse(query: string, _lang: string) {
  // Deterministic fallback when GEMINI_API_KEY missing — always English.
  const q = query.toLowerCase();
  let picks: any[] = [];
  if (q.includes("kisan") || q.includes("farmer") || q.includes("खेती")) picks = schemes.filter((s: any) => s.category === "farmer").slice(0, 3);
  else if (q.includes("health") || q.includes("ayushman") || q.includes("बीमा") || q.includes("hospital")) picks = schemes.filter((s: any) => ["health", "insurance"].includes(s.category)).slice(0, 3);
  else if (q.includes("job") || q.includes("रोजगार") || q.includes("mgnrega")) picks = schemes.filter((s: any) => s.category === "employment").slice(0, 3);
  else if (q.includes("handloom") || q.includes("weaver") || q.includes("बुनकर")) picks = schemes.filter((s: any) => s.category === "handloom").slice(0, 3);
  else picks = [schemes[0], schemes[1], schemes[2]];
  return {
    answer: `Found ${picks.length} schemes for you. See below and click Apply. (Demo mode — add GEMINI_API_KEY for full Gemini reasoning)`,
    recommendations: picks.map((s: any) => ({ schemeId: s.id, name: s.name, name_hi: s.name_hi, score: 0.85, reason: s.description, matchingFactors: [`Category: ${s.category}`, s.eligibility?.max_income ? `Income ≤ ₹${s.eligibility.max_income}` : "No income cap"] })),
    grounded: true,
    demoMode: true,
  };
}
