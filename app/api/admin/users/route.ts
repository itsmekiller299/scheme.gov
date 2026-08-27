import connectDB from "@/app/lib/mongodb";
import User from "@/app/models/User";
import { requireAdmin } from "@/app/lib/auth";

export async function GET(request: Request) {
  const admin = await requireAdmin(request as any);
  if (!admin) return new Response(JSON.stringify({ success: false, error: "Admin only" }), { status: 403, headers: { "Content-Type": "application/json" } });
  await connectDB();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 }).limit(limit).lean();
  return new Response(JSON.stringify({ success: true, users }), { status: 200, headers: { "Content-Type": "application/json" } });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request as any);
  if (!admin) return new Response(JSON.stringify({ success: false, error: "Admin only" }), { status: 403, headers: { "Content-Type": "application/json" } });
  const body = await request.json();
  const { userId, role } = body;
  if (!userId || !["admin", "staff", "user"].includes(role)) {
    return new Response(JSON.stringify({ success: false, error: "userId and valid role required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (!/^[a-f\d]{24}$/i.test(userId)) return new Response(JSON.stringify({ success: false, error: "Invalid userId" }), { status: 400, headers: { "Content-Type": "application/json" } });
  await connectDB();
  const user = await User.findByIdAndUpdate(userId, { role }, { new: true, projection: { password: 0 } }).lean();
  if (!user) return new Response(JSON.stringify({ success: false, error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  return new Response(JSON.stringify({ success: true, user }), { status: 200, headers: { "Content-Type": "application/json" } });
}
