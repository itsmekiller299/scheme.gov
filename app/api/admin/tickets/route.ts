import connectDB from "@/app/lib/mongodb";
import CustomerTicket from "@/app/models/CustomerTicket";
import { requireAdmin } from "@/app/lib/auth";

export async function GET(request: Request) {
  const admin = await requireAdmin(request as any);
  if (!admin) return new Response(JSON.stringify({ success: false, error: "Admin only" }), { status: 403, headers: { "Content-Type": "application/json" } });
  await connectDB();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const filter: any = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  const list = await CustomerTicket.find(filter).sort({ updatedAt: -1 }).limit(limit).lean();
  return new Response(JSON.stringify({ success: true, tickets: list }), { status: 200, headers: { "Content-Type": "application/json" } });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request as any);
  if (!admin) return new Response(JSON.stringify({ success: false, error: "Admin only" }), { status: 403, headers: { "Content-Type": "application/json" } });
  const body = await request.json();
  const { ticketId, status, priority, assignedTo, message } = body;
  if (!ticketId) return new Response(JSON.stringify({ success: false, error: "ticketId required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  await connectDB();
  const ticket = await CustomerTicket.findOne({ ticketId });
  if (!ticket) return new Response(JSON.stringify({ success: false, error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  if (status && ["open", "in_progress", "waiting", "resolved", "closed"].includes(status)) (ticket as any).status = status;
  if (priority && ["low", "medium", "high", "urgent"].includes(priority)) (ticket as any).priority = priority;
  if (assignedTo !== undefined) (ticket as any).assignedTo = String(assignedTo).slice(0, 100) || null;
  if (message) {
    const sanitized = String(message).replace(/<[^>]*>/g, "").slice(0, 2000);
    (ticket as any).messages.push({ sender: admin.email, senderRole: admin.role, message: sanitized, at: new Date() });
    if ((ticket as any).status === "open") (ticket as any).status = "in_progress";
  }
  await ticket.save();
  return new Response(JSON.stringify({ success: true, ticket }), { status: 200, headers: { "Content-Type": "application/json" } });
}
