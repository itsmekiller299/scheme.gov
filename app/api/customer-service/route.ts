import connectDB from "@/app/lib/mongodb";
import CustomerTicket from "@/app/models/CustomerTicket";
import { verifyAuth, checkRateLimit, getClientIp } from "@/app/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  subject: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  category: z.enum(["general", "scheme", "application", "grievance", "technical", "handloom", "other"]).default("general"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  schemeId: z.string().max(100).optional().nullable(),
});

const replySchema = z.object({
  ticketId: z.string().min(5),
  message: z.string().min(2).max(2000),
});

export async function POST(request: Request) {
  try {
    const auth = await verifyAuth(request as any);
    if (!auth) return new Response(JSON.stringify({ success: false, error: "Unauthorized — please login" }), { status: 401, headers: { "Content-Type": "application/json" } });
    const ip = getClientIp(request);
    if (!checkRateLimit(`cs_post:${ip}`, 10, 10 * 60 * 1000)) {
      return new Response(JSON.stringify({ success: false, error: "Too many tickets, try later" }), { status: 429, headers: { "Content-Type": "application/json" } });
    }

    const body = await request.json();
    // Distinguish create vs reply by presence of ticketId+message only
    if (body.ticketId && body.message) {
      const parsed = replySchema.safeParse(body);
      if (!parsed.success) return new Response(JSON.stringify({ success: false, error: parsed.error.issues[0].message }), { status: 400, headers: { "Content-Type": "application/json" } });
      await connectDB();
      const ticket = await CustomerTicket.findOne({ ticketId: body.ticketId });
      if (!ticket) return new Response(JSON.stringify({ success: false, error: "Ticket not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
      // Only owner or admin can reply
      const isAdmin = auth.role === "admin" || auth.role === "staff";
      if ((ticket as any).email !== auth.email.toLowerCase() && !isAdmin) {
        return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      const sanitized = String(body.message).replace(/<[^>]*>/g, "").slice(0, 2000);
      (ticket as any).messages.push({ sender: auth.email, senderRole: auth.role, message: sanitized, at: new Date() });
      // If user replies, reopen if closed; if admin replies, mark in_progress
      if (isAdmin && ticket.status === "open") (ticket as any).status = "in_progress";
      if (!isAdmin && ticket.status === "resolved") (ticket as any).status = "open";
      await ticket.save();
      return new Response(JSON.stringify({ success: true, ticket }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return new Response(JSON.stringify({ success: false, error: parsed.error.issues[0].message }), { status: 400, headers: { "Content-Type": "application/json" } });
    const data = parsed.data;
    const sanitizedSubject = String(data.subject).replace(/<[^>]*>/g, "").slice(0, 200);
    const sanitizedDesc = String(data.description).replace(/<[^>]*>/g, "").slice(0, 2000);

    await connectDB();
    const ticketId = `CS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const ticket = await CustomerTicket.create({
      ticketId,
      email: auth.email.toLowerCase(),
      name: (auth as any).name || undefined,
      subject: sanitizedSubject,
      description: sanitizedDesc,
      category: data.category,
      priority: data.priority,
      status: "open",
      schemeId: data.schemeId || null,
      messages: [{ sender: auth.email, senderRole: auth.role, message: sanitizedDesc, at: new Date() }],
      userId: (auth as any).id,
    } as any);
    return new Response(JSON.stringify({ success: true, ticket }), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("CustomerService POST error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request as any);
    if (!auth) return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    await connectDB();
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get("ticketId") || searchParams.get("id");
    const isAdmin = auth.role === "admin" || auth.role === "staff";
    if (ticketId) {
      const ticket = await CustomerTicket.findOne({ ticketId }).lean();
      if (!ticket) return new Response(JSON.stringify({ success: false, error: "Ticket not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
      if ((ticket as any).email !== auth.email.toLowerCase() && !isAdmin) {
        return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true, ticket }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    // User sees own tickets; admin sees all if ?all=1
    const all = searchParams.get("all") === "1" && isAdmin;
    const filter: any = all ? {} : { email: auth.email.toLowerCase() };
    const status = searchParams.get("status");
    if (status) filter.status = status;
    const list = await CustomerTicket.find(filter).sort({ updatedAt: -1 }).limit(50).lean();
    return new Response(JSON.stringify({ success: true, tickets: list }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("CustomerService GET error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await verifyAuth(request as any);
    if (!auth || (auth.role !== "admin" && auth.role !== "staff")) {
      return new Response(JSON.stringify({ success: false, error: "Admin only" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
    const body = await request.json();
    const { ticketId, status, priority, assignedTo } = body;
    if (!ticketId) return new Response(JSON.stringify({ success: false, error: "ticketId required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    await connectDB();
    const ticket = await CustomerTicket.findOne({ ticketId });
    if (!ticket) return new Response(JSON.stringify({ success: false, error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    if (status && ["open", "in_progress", "waiting", "resolved", "closed"].includes(status)) (ticket as any).status = status;
    if (priority && ["low", "medium", "high", "urgent"].includes(priority)) (ticket as any).priority = priority;
    if (assignedTo !== undefined) (ticket as any).assignedTo = String(assignedTo).slice(0, 100) || null;
    await ticket.save();
    return new Response(JSON.stringify({ success: true, ticket }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("CustomerService PATCH error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
