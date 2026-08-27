import connectDB from "@/app/lib/mongodb";
import Scheme from "@/app/models/Scheme";
import fallbackSchemes from "@/app/data/schemes.json";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // Try DB first
    try {
      await connectDB();
      const count = await Scheme.countDocuments();
      // Sync DB with fallback JSON (auto-seed + handle expansion 13 -> 88)
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

      if (id) {
        const scheme = await Scheme.findOne({ schemeId: id }).lean();
        if (!scheme) {
          return new Response(JSON.stringify({ success: false, error: "Scheme not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        // normalize to {id, ...}
        const normalized = {
          id: (scheme as any).schemeId,
          name: (scheme as any).name,
          name_hi: (scheme as any).name_hi,
          description: (scheme as any).description,
          description_hi: (scheme as any).description_hi,
          eligibility: (scheme as any).eligibility,
          benefits: (scheme as any).benefits,
          benefits_hi: (scheme as any).benefits_hi,
          documents_required: (scheme as any).documents_required,
          documents_required_hi: (scheme as any).documents_required_hi,
          category: (scheme as any).category,
          state_coverage: (scheme as any).state_coverage,
        };
        return new Response(JSON.stringify({ success: true, scheme: normalized }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const schemes = await Scheme.find().lean();
      const normalizedList = schemes.map((s: any) => ({
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
      return new Response(JSON.stringify({ success: true, schemes: normalizedList }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (dbErr) {
      // Fallback to JSON
      console.warn("Schemes DB fallback:", (dbErr as Error).message);
      if (id) {
        const found = (fallbackSchemes as any[]).find((s) => s.id === id);
        if (!found)
          return new Response(JSON.stringify({ success: false, error: "Scheme not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        return new Response(JSON.stringify({ success: true, scheme: found }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, schemes: fallbackSchemes }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("Schemes GET error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
