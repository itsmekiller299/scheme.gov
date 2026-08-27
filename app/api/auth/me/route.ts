import { verifyAuth } from "@/app/lib/auth";
import connectDB from "@/app/lib/mongodb";
import User from "@/app/models/User";

export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request as any);
    if (!auth) return new Response(JSON.stringify({ success: false, error: "Not authenticated" }), { status: 401, headers: { "Content-Type": "application/json" } });
    await connectDB();
    const user = await User.findById(auth.id).lean();
    if (!user) return new Response(JSON.stringify({ success: false, error: "User not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ success: true, user: { id: (user as any)._id, email: (user as any).email, name: (user as any).name, role: (user as any).role } }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: "Internal error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
