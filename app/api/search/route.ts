import connectDB from "@/app/lib/mongodb";
import Scheme from "@/app/models/Scheme";
import fallbackSchemes from "@/app/data/schemes.json";

interface SearchBody {
  language: string;
  income: number;
  category?: string;
  state?: string;
}

export async function POST(request: Request) {
  try {
    const body: SearchBody = await request.json();
    const { language, income, category, state } = body;

    if (!language || isNaN(income) || income < 0) {
      return new Response(JSON.stringify({ success: false, error: "Invalid parameters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let schemes: any[] = [];
    try {
      await connectDB();
      const count = await Scheme.countDocuments();
      if (count === 0) {
        // Seed from fallback if empty
        const toInsert = fallbackSchemes.map((s: any) => ({
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
        }));
        await Scheme.insertMany(toInsert);
      }
      schemes = await Scheme.find().lean();
      // Map DB shape to expected shape
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

    const results = schemes.filter((s: any) => {
      const maxIncome =
        typeof s.eligibility.max_income === "number"
          ? s.eligibility.max_income
          : parseInt(s.eligibility.max_income || "1000000");
      const incomeOk = income >= 0 && income <= maxIncome;
      const categoryOk = !category || s.category === category;
      const stateOk = !state || s.state_coverage.includes("ALL") || s.state_coverage.includes(state);
      return incomeOk && categoryOk && stateOk;
    });

    const scored = results.map((s: any) => {
      let score = 0.5;
      const factors: string[] = [];
      if (category === s.category) {
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
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
