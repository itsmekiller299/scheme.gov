import connectDB from "@/app/lib/mongodb";
import User from "@/app/models/User";
import Scheme from "@/app/models/Scheme";
import Application from "@/app/models/Application";
import Grievance from "@/app/models/Grievance";
import CustomerTicket from "@/app/models/CustomerTicket";
import { requireAdmin } from "@/app/lib/auth";

export async function GET(request: Request) {
  const admin = await requireAdmin(request as any);
  if (!admin) return new Response(JSON.stringify({ success: false, error: "Admin only" }), { status: 403, headers: { "Content-Type": "application/json" } });
  try {
    await connectDB();
    const [users, schemes, applications, grievances, tickets] = await Promise.all([
      User.countDocuments(),
      Scheme.countDocuments(),
      Application.countDocuments(),
      Grievance.countDocuments(),
      CustomerTicket.countDocuments(),
    ]);
    const appByStatus = await Application.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const grievByStatus = await Grievance.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const ticketByStatus = await CustomerTicket.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const ticketByPriority = await CustomerTicket.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]);
    const recentApps = await Application.find().sort({ createdAt: -1 }).limit(5).lean();
    const recentTickets = await CustomerTicket.find().sort({ createdAt: -1 }).limit(5).lean();

    return new Response(
      JSON.stringify({
        success: true,
        stats: { users, schemes, applications, grievances, tickets },
        breakdown: { appByStatus, grievByStatus, ticketByStatus, ticketByPriority },
        recent: { applications: recentApps.map((a: any) => ({ ...a, aadhaarNumber: undefined })), tickets: recentTickets },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Admin stats error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
