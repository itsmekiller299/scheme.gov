import connectDB from "@/app/lib/mongodb";
import Scheme from "@/app/models/Scheme";
import fallbackSchemes from "@/app/data/schemes.json";
import { checkRateLimit, getClientIp } from "@/app/lib/auth";
import { z } from "zod";

const searchSchema = z.object({
  language: z.string().min(2).max(10),
  income: z.number().min(0).max(10000000),
  category: z.string().max(50).optional(),
  state: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(`search:${ip}`, 30, 60 * 1000)) {
      return new Response(JSON.stringify({ success: false, error: "Too many requests, try later" }), { status: 429, headers: { "Content-Type": "application/json" } });
    }

    const body = await request.json();
    const parsed = searchSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ success: false, error: parsed.error.issues[0]?.message || "Invalid parameters" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const { language, income, category, state } = parsed.data;

    let schemes: any[] = [];
    try {
      await connectDB();
      const count = await Scheme.countDocuments();
      if (count < fallbackSchemes.length) {
        const bulkOps = fallbackSchemes.map((s: any) => ({
          updateOne: {
            filter: { schemeId: s.id },
            update: {
              $set: {
                schemeId: s.id,
                name: s.name,
                name_hi: s.name_hi,
                description: s.description,
                description_hi: s.description_hi,
                eligibility: s.eligibility,
                benefits: s.benefits,
                benefits_hi: s.benefits_hi,
                documents_required: s.documents_required,
                documents_required_hi: s.documents_required_hi,
                category: s.category,
                state_coverage: s.state_coverage,
              },
            },
            upsert: true,
          },
        }));
        await Scheme.bulkWrite(bulkOps);
      }
      schemes = await Scheme.find().lean();
      schemes = schemes.map((s: any) => ({
        id: s.schemeId,
        name: s.name,
        name_hi: s.name_hi,
        description: s.description,
        description_hi: s.description_hi,
        eligibility: s.eligibility,
        benefits: s.benefits,
        benefits_hi: s.benefits_hi,
        documents_required: s.documents_required,
        documents_required_hi: s.documents_required_hi,
        category: s.category,
        state_coverage: s.state_coverage,
      }));
    } catch (dbErr) {
      console.warn("DB fallback to JSON:", (dbErr as Error).message);
      schemes = fallbackSchemes as any[];
    }

    // Sanitize category/state allowlist
    const allowedCategories = new Set(fallbackSchemes.map((s: any) => s.category));
    const safeCategory = category && allowedCategories.has(category) ? category : undefined;

    const results = schemes.filter((s: any) => {
      const maxIncome =
        typeof s.eligibility.max_income === "number"
          ? s.eligibility.max_income
          : parseInt(s.eligibility.max_income || "1000000");
      const incomeOk = income >= 0 && income <= maxIncome;
      const categoryOk = !safeCategory || s.category === safeCategory;
      const stateOk = !state || s.state_coverage.includes("ALL") || s.state_coverage.includes(state);
      return incomeOk && categoryOk && stateOk;
    });

    const scored = results.map((s: any) => {
      let score = 0.5;
      const factors: string[] = [];
      if (safeCategory === s.category) {
        score += 0.2;
        factors.push(`Category: ${s.category}`);
      }
      if (s.eligibility.max_income) factors.push(`Income ≤ ₹${s.eligibility.max_income}`);
      return { scheme: s, score: Math.min(score, 1), matchingFactors: factors };
    });

    const matched = scored.sort((a, b) => b.score - a.score).filter((m) => m.score > 0.3);

    return new Response(JSON.stringify({ success: true, matches: matched }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Search error:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
