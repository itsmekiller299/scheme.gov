import connectDB from "@/app/lib/mongodb";
import Application from "@/app/models/Application";
import { verifyAuth, checkRateLimit, getClientIp } from "@/app/lib/auth";
import { z } from "zod";

const appSchema = z.object({
  schemeId: z.string().min(2).max(100),
  schemeName: z.string().min(2).max(200),
  applicantName: z.string().min(2).max(100),
  email: z.string().email().max(254),
  phone: z.string().regex(/^\d{10,15}$/, "Phone must be 10-15 digits"),
  documents_required: z.array(z.string().min(1)).min(1).max(20),
  documents: z.record(z.string(), z.any()).optional(),
  documentFiles: z.record(z.string(), z.string()).optional(),
  aadhaarNumber: z.string().optional(),
  aadhaarLast4: z.string().optional(),
  state: z.string().max(100).optional(),
  income: z.union([z.string(), z.number()]).optional(),
  address: z.string().max(500).optional(),
});

function sanitizeFileUrl(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  if (!v.startsWith("/uploads/")) return undefined;
  if (v.includes("..") || v.includes("//")) return undefined;
  return v.slice(0, 200);
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(`app_post:${ip}`, 10, 10 * 60 * 1000)) {
      return new Response(JSON.stringify({ success: false, error: "Too many applications, try later" }), { status: 429, headers: { "Content-Type": "application/json" } });
    }

    // Require auth for PII-heavy submission — optional but enforce if logged in; otherwise allow but rate-limited
    // For stronger security, require auth:
    // const auth = await verifyAuth(request as any);
    // if (!auth) return new Response(JSON.stringify({success:false,error:"Unauthorized"}),{status:401})

    await connectDB();
    const body = await request.json();
    const parsed = appSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ success: false, error: parsed.error.issues[0]?.message || "Invalid input" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const data = parsed.data as any;

    // Build documents array from checklist + uploaded fileUrls
    const docs = (data.documents_required as string[]).map((name: string) => {
      const val = data.documents?.[name];
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let provided = false;
      if (val && typeof val === "object") {
        fileUrl = sanitizeFileUrl(val.fileUrl);
        fileName = typeof val.fileName === "string" ? val.fileName.slice(0, 100) : undefined;
        provided = !!val.provided || !!fileUrl;
      } else {
        provided = val === true || (Array.isArray(data.documents) && data.documents.includes(name)) || false;
      }
      return { name: name.slice(0, 100), provided: !!provided, fileUrl, fileName };
    });
    if (data.documentFiles) {
      for (const d of docs) {
        const v = sanitizeFileUrl(data.documentFiles[d.name]);
        if (v) {
          d.fileUrl = v;
          d.provided = true;
        }
      }
    }

    // PII: Store ONLY last 4 digits, never full 12-digit Aadhaar
    const rawAadhaar = (data.aadhaarNumber || data.aadhaarLast4 || "").toString().replace(/\s/g, "");
    let aadhaarLast4: string | null = null;
    if (rawAadhaar) {
      if (/^\d{12}$/.test(rawAadhaar)) aadhaarLast4 = rawAadhaar.slice(-4);
      else if (/^\d{4}$/.test(rawAadhaar)) aadhaarLast4 = rawAadhaar;
      else return new Response(JSON.stringify({ success: false, error: "Aadhaar must be 12 digits (or 4 for legacy)" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const appDoc: any = await Application.create({
      schemeId: data.schemeId,
      schemeName: data.schemeName,
      applicantName: data.applicantName.trim(),
      email: data.email.toLowerCase(),
      phone: data.phone,
      aadhaarNumber: undefined, // never store full number for security
      aadhaarLast4: aadhaarLast4 || undefined,
      state: data.state || undefined,
      income: data.income ? Number(data.income) : undefined,
      address: data.address || undefined,
      documents: docs,
      documents_required: data.documents_required,
      status: "submitted",
    });

    // Never return full aadhaarNumber
    const safeApp = { ...appDoc.toObject(), aadhaarNumber: undefined };
    return new Response(
      JSON.stringify({ success: true, applicationId: appDoc._id, application: safeApp }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Application POST error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const email = searchParams.get("email");

    // Require auth for PII listing / detail
    const auth = await verifyAuth(request as any);
    if (!auth) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized — please login" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    if (id) {
      if (!/^[a-f\d]{24}$/i.test(id)) return new Response(JSON.stringify({ success: false, error: "Invalid id" }), { status: 400, headers: { "Content-Type": "application/json" } });
      const doc = await Application.findById(id).lean();
      if (!doc) {
        return new Response(JSON.stringify({ success: false, error: "Application not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
      }
      // Only owner or same email can view
      const d = doc as any;
      if (d.email !== auth.email.toLowerCase() && String(d.userId) !== String(auth.id)) {
        // For demo, allow owner only; hide PII if not owner
        return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      const safe = { ...d, aadhaarNumber: undefined };
      return new Response(JSON.stringify({ success: true, application: safe }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // List by email or latest 20 — but only own data
    const filter: Record<string, unknown> = { email: auth.email.toLowerCase() };
    // If email query differs from auth, deny (prevent enumeration)
    if (email && email.toLowerCase() !== auth.email.toLowerCase()) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
    const list = await Application.find(filter).sort({ createdAt: -1 }).limit(20).lean();
    const safeList = (list as any[]).map((d) => ({ ...d, aadhaarNumber: undefined }));
    return new Response(JSON.stringify({ success: true, applications: safeList }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Application GET error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
