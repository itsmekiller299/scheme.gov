import connectDB from "@/app/lib/mongodb";
import Scheme from "@/app/models/Scheme";
import User from "@/app/models/User";
import fallbackSchemes from "@/app/data/schemes.json";
import bcrypt from "bcryptjs";

export async function POST() {
  try {
    await connectDB();

    // Seed schemes
    let schemeCount = await Scheme.countDocuments();
    if (schemeCount === 0) {
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
      schemeCount = toInsert.length;
    }

    // Seed demo user
    let demo = await User.findOne({ email: "demo@welfare.gov.in" });
    if (!demo) {
      const hashed = await bcrypt.hash("demo123", 10);
      demo = await User.create({ email: "demo@welfare.gov.in", password: hashed, name: "Demo User" });
    }

    return new Response(
      JSON.stringify({ success: true, schemes: schemeCount, demoUser: demo.email }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Seed error:", err);
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET() {
  return POST();
}
