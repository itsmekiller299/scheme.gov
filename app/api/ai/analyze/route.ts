import { getGemini, hasGeminiKey, GEMINI_MODEL } from "@/app/lib/gemini";
import schemes from "@/app/data/schemes.json";
import { checkRateLimit, getClientIp } from "@/app/lib/auth";
import { z } from "zod";

const schema = z.object({
  schemeId: z.string().min(1).max(100),
  documents: z.array(z.string()).max(20).optional(), // list user says they have
  fileName: z.string().max(200).optional(),
  // For vision: base64 image/pdf snippet if provided
  fileBase64: z.string().max(2000000).optional(),
  mimeType: z.string().max(100).optional(),
  language: z.string().max(10).default("en"),
  applicantIncome: z.number().optional(),
  applicantState: z.string().optional(),
});

// POST /api/ai/analyze — Document intelligence + eligibility check
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(`ai_analyze:${ip}`, 15, 60 * 1000)) {
      return new Response(JSON.stringify({ success: false, error: "Too many requests" }), { status: 429, headers: { "Content-Type": "application/json" } });
    }
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return new Response(JSON.stringify({ success: false, error: parsed.error.issues[0].message }), { status: 400, headers: { "Content-Type": "application/json" } });
    const { schemeId, documents, fileName, fileBase64, mimeType, language, applicantIncome, applicantState } = parsed.data;

    const scheme = (schemes as any[]).find((s) => s.id === schemeId);
    if (!scheme) return new Response(JSON.stringify({ success: false, error: "Scheme not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

    const docsLower = (documents || []).map((d) => d.toLowerCase());
    const required = scheme.documents_required as string[];
    const missing = required.filter((r) => !docsLower.some((d) => r.toLowerCase().includes(d) || d.includes(r.toLowerCase().slice(0, 8))));
    const present = required.filter((r) => !missing.includes(r));
    const completeness = required.length ? present.length / required.length : 1;
    let incomeOk: boolean | null = null;
    let stateOk: boolean | null = null;
    if (applicantIncome !== undefined && scheme.eligibility?.max_income) {
      const max = Number(scheme.eligibility.max_income);
      if (!Number.isNaN(max)) incomeOk = applicantIncome <= max;
    }
    if (applicantState && scheme.state_coverage) {
      stateOk = scheme.state_coverage.includes("ALL") || scheme.state_coverage.includes(applicantState);
    }
    const eligible = (incomeOk !== false) && (stateOk !== false) && completeness >= 0.5;

    // If file provided + Gemini key, run vision analysis
    let vision: any = null;
    const genAI = getGemini();
    if (fileBase64 && mimeType && genAI && hasGeminiKey()) {
      try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const prompt = `You are document verification AI for scheme ${scheme.name} (${scheme.id}). Required docs: ${required.join(", ")}. User uploaded file: ${fileName || "doc"}. Tell if this looks like a valid document for this scheme. Reply JSON {valid: boolean, docType, confidence 0-1, issues: string[], extracted: {name?, aadhaarLast4?, state?}}. Keep short.`;
        const res = await model.generateContent([
          { text: prompt },
          { inlineData: { data: fileBase64, mimeType: mimeType || "image/jpeg" } } as any,
        ]);
        const t = res.response.text();
        try { vision = JSON.parse(t.match(/\{[\s\S]*\}/)?.[0] || "{}"); } catch { vision = { raw: t.slice(0, 500) }; }
      } catch (e: any) {
        const m = e?.message || String(e);
        vision = { error: m.slice(0,300), hint: m.includes("API_KEY") ? "Invalid key — verify GET /api/ai/verify" : m.includes("quota") ? "Quota — wait 60s" : "Try smaller image (max 2MB)" };
      }
    } else if (fileBase64 && !hasGeminiKey()) {
      vision = { demoMode: true, note: "Add GEMINI_API_KEY for vision OCR" };
    }

    // Gemini textual reasoning for eligibility (if key available)
    let aiAdvice: string | null = null;
    if (genAI && hasGeminiKey()) {
      try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const p = `Scheme: ${scheme.name} (${scheme.id}) desc:${scheme.description} eligibility:${JSON.stringify(scheme.eligibility)} docs:${required.join(",")} User: income ${applicantIncome ?? "?"}, state ${applicantState ?? "?"}, has docs: ${(documents || []).join(",") || "none"}, missing: ${missing.join(",") || "none"}. Language: ${language}. Give 2-sentence advice in ${language==='hi'?'Hindi':'English'}: eligible? what's missing?`;
        const r = await model.generateContent(p);
        aiAdvice = r.response.text().trim().slice(0, 600);
      } catch {}
    }

    return new Response(JSON.stringify({
      success: true,
      schemeId, schemeName: scheme.name,
      completeness: Math.round(completeness * 100),
      present, missing,
      eligibility: { incomeOk, stateOk, eligible, completeness },
      vision,
      aiAdvice: aiAdvice || (language === "hi" ? `${present.length}/${required.length} दस्तावेज़ हैं। कमी: ${missing.join(", ") || "कोई नहीं"}` : `${present.length}/${required.length} docs ready. Missing: ${missing.join(", ") || "none"}`),
      model: hasGeminiKey() ? GEMINI_MODEL : "rule-based-demo",
    }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("analyze error", e);
    return new Response(JSON.stringify({ success: false, error: "Analysis failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function GET() {
  return new Response(JSON.stringify({ success: true, endpoint: "POST /api/ai/analyze {schemeId, documents[], fileBase64?}", model: GEMINI_MODEL, hasKey: hasGeminiKey() }), { headers: { "Content-Type": "application/json" } });
}
