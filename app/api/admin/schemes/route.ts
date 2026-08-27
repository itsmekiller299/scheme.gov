import connectDB from "@/app/lib/mongodb";
import Scheme from "@/app/models/Scheme";
import { requireAdmin } from "@/app/lib/auth";

export async function POST(request: Request) {
  const admin = await requireAdmin(request as any);
  if (!admin) return new Response(JSON.stringify({ success: false, error: "Admin only" }), { status: 403, headers: { "Content-Type": "application/json" } });
  const body = await request.json();
  const { schemeId, name, description, category, benefits, documents_required, state_coverage } = body;
  if (!schemeId || !name || !description) return new Response(JSON.stringify({ success: false, error: "schemeId, name, description required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  await connectDB();
  const exists = await Scheme.findOne({ schemeId });
  if (exists) return new Response(JSON.stringify({ success: false, error: "Scheme already exists" }), { status: 409, headers: { "Content-Type": "application/json" } });
  const doc = await Scheme.create({
    schemeId,
    name,
    name_hi: body.name_hi,
    description,
    description_hi: body.description_hi,
    eligibility: body.eligibility || {},
    benefits: benefits || [],
    benefits_hi: body.benefits_hi || [],
    documents_required: documents_required || [],
    documents_required_hi: body.documents_required_hi || [],
    category: category || "other",
    state_coverage: state_coverage || ["ALL"],
  });
  return new Response(JSON.stringify({ success: true, scheme: doc }), { status: 201, headers: { "Content-Type": "application/json" } });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request as any);
  if (!admin) return new Response(JSON.stringify({ success: false, error: "Admin only" }), { status: 403, headers: { "Content-Type": "application/json" } });
  const body = await request.json();
  const { schemeId, updates } = body;
  if (!schemeId || !updates) return new Response(JSON.stringify({ success: false, error: "schemeId and updates required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  await connectDB();
  const doc = await Scheme.findOneAndUpdate({ schemeId }, { $set: updates }, { new: true }).lean();
  if (!doc) return new Response(JSON.stringify({ success: false, error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  return new Response(JSON.stringify({ success: true, scheme: doc }), { status: 200, headers: { "Content-Type": "application/json" } });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(request as any);
  if (!admin) return new Response(JSON.stringify({ success: false, error: "Admin only" }), { status: 403, headers: { "Content-Type": "application/json" } });
  const { searchParams } = new URL(request.url);
  const schemeId = searchParams.get("schemeId") || searchParams.get("id");
  if (!schemeId) return new Response(JSON.stringify({ success: false, error: "schemeId required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  await connectDB();
  await Scheme.deleteOne({ schemeId });
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
}
