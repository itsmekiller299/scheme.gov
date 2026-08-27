import connectDB from "@/app/lib/mongodb";
import Grievance from "@/app/models/Grievance";
import { requireAdmin } from "@/app/lib/auth";

export async function GET(request: Request) {
  const admin = await requireAdmin(request as any);
  if (!admin) return new Response(JSON.stringify({ success: false, error: "Admin only" }), { status: 403, headers: { "Content-Type": "application/json" } });
  await connectDB();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const filter: any = {};
  if (status) filter.status = status;
  const list = await Grievance.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  return new Response(JSON.stringify({ success: true, grievances: list.map((g: any) => ({ ...g, aadhaarNumber: undefined })) }), { status: 200, headers: { "Content-Type": "application/json" } });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request as any);
  if (!admin) return new Response(JSON.stringify({ success: false, error: "Admin only" }), { status: 403, headers: { "Content-Type": "application/json" } });
  const body = await request.json();
  const { id, status } = body;
  if (!id || !["submitted", "in_progress", "resolved", "rejected"].includes(status)) {
    return new Response(JSON.stringify({ success: false, error: "id and valid status required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (!/^[a-f\d]{24}$/i.test(id)) return new Response(JSON.stringify({ success: false, error: "Invalid id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  await connectDB();
  const doc = await Grievance.findByIdAndUpdate(id, { status }, { new: true }).lean();
  if (!doc) return new Response(JSON.stringify({ success: false, error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  return new Response(JSON.stringify({ success: true, grievance: { ...(doc as any), aadhaarNumber: undefined } }), { status: 200, headers: { "Content-Type": "application/json" } });
}
