import connectDB from "@/app/lib/mongodb";
import Grievance from "@/app/models/Grievance";

// Fallback in-memory storage when MongoDB is unavailable (keeps localhost working without DB)
type MemGrievance = {
  _id: string;
  aadhaarLast4: string | null;
  contact: string | null;
  description: string;
  schemeId: string | null;
  referenceNumber: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};
const memGrievances: MemGrievance[] = [];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!body?.description) {
    return new Response(JSON.stringify({ success: false, error: "Description required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    await connectDB();
    const doc = await Grievance.create({
      aadhaarLast4: body?.aadhaarLast4 || null,
      contact: body?.contact || null,
      description: body.description,
      schemeId: body?.schemeId || null,
      referenceNumber: body?.referenceNumber || null,
      status: "submitted",
    });
    return new Response(
      JSON.stringify({ success: true, grievanceId: doc._id, grievance: doc }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.warn("Grievance POST fallback to memory:", (error as Error).message);
    const mem: MemGrievance = {
      _id: "grv-" + Date.now().toString(36) + Math.random().toString(36).slice(2),
      aadhaarLast4: body?.aadhaarLast4 || null,
      contact: body?.contact || null,
      description: body.description,
      schemeId: body?.schemeId || null,
      referenceNumber: body?.referenceNumber || null,
      status: "submitted",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memGrievances.push(mem);
    return new Response(JSON.stringify({ success: true, grievanceId: mem._id, grievance: mem }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const grievanceId = searchParams.get("id");
  try {
    await connectDB();
    if (!grievanceId) {
      const list = await Grievance.find().sort({ createdAt: -1 }).limit(50).lean();
      return new Response(JSON.stringify({ success: true, grievances: list }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }
    const grievance = await Grievance.findById(grievanceId).lean();
    if (!grievance) {
      return new Response(JSON.stringify({ success: false, error: "Grievance not found" }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, grievance }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.warn("Grievance GET fallback to memory:", (error as Error).message);
    if (!grievanceId) {
      return new Response(JSON.stringify({ success: true, grievances: memGrievances.slice(-50).reverse() }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }
    const found = memGrievances.find((g) => g._id === grievanceId);
    if (!found) {
      return new Response(JSON.stringify({ success: false, error: "Grievance not found" }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, grievance: found }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }
}
