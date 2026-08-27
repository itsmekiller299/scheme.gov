import connectDB from "@/app/lib/mongodb";
import Grievance from "@/app/models/Grievance";
import { verifyAuth, checkRateLimit, getClientIp } from "@/app/lib/auth";
import { z } from "zod";

const grievanceSchema = z.object({
  description: z.string().min(10).max(2000),
  contact: z.string().max(100).optional().nullable(),
  schemeId: z.string().max(100).optional().nullable(),
  referenceNumber: z.string().max(100).optional().nullable(),
  aadhaarNumber: z.string().optional(),
  aadhaarLast4: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ip = getClientIp(request);
  if (!checkRateLimit(`grievance_post:${ip}`, 10, 10 * 60 * 1000)) {
    return new Response(JSON.stringify({ success: false, error: "Too many grievances, try later" }), { status: 429, headers: { "Content-Type": "application/json" } });
  }

  const parsed = grievanceSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ success: false, error: parsed.error.issues[0]?.message || "Invalid input" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const data = parsed.data;

  // Sanitize description: strip <script> tags
  const sanitizedDesc = data.description.replace(/<[^>]*>/g, "").slice(0, 2000);

  try {
    await connectDB();
    const rawAadhaar = (data.aadhaarNumber || data.aadhaarLast4 || "").toString().replace(/\s/g, "");
    let aadhaarLast4: string | null = null;
    if (rawAadhaar) {
      if (/^\d{12}$/.test(rawAadhaar)) aadhaarLast4 = rawAadhaar.slice(-4);
      else if (/^\d{4}$/.test(rawAadhaar)) aadhaarLast4 = rawAadhaar;
      else return new Response(JSON.stringify({ success: false, error: "Aadhaar must be 12 digits (or 4)" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const doc = await Grievance.create({
      aadhaarNumber: null, // never store full
      aadhaarLast4,
      contact: data.contact ? String(data.contact).slice(0, 100) : null,
      description: sanitizedDesc,
      schemeId: data.schemeId ? String(data.schemeId).slice(0, 100) : null,
      referenceNumber: data.referenceNumber ? String(data.referenceNumber).slice(0, 100) : null,
      status: "submitted",
    });
    const safe = { ...doc.toObject(), aadhaarNumber: undefined };
    return new Response(
      JSON.stringify({ success: true, grievanceId: doc._id, grievance: safe }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Grievance POST error:", (error as Error).message);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const grievanceId = searchParams.get("id");
  try {
    await connectDB();
    // Require auth for grievance listing (PII)
    const auth = await verifyAuth(request as any);
    if (!auth) return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

    if (!grievanceId) {
      const list = await Grievance.find().sort({ createdAt: -1 }).limit(20).lean();
      const safeList = (list as any[]).map((g) => ({ ...g, aadhaarNumber: undefined }));
      return new Response(JSON.stringify({ success: true, grievances: safeList }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (!/^[a-f\d]{24}$/i.test(grievanceId) && !grievanceId.startsWith("grv-")) {
      return new Response(JSON.stringify({ success: false, error: "Invalid id" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const grievance = await Grievance.findById(grievanceId).lean();
    if (!grievance) {
      return new Response(JSON.stringify({ success: false, error: "Grievance not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    const safe = { ...(grievance as any), aadhaarNumber: undefined };
    return new Response(JSON.stringify({ success: true, grievance: safe }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
