import connectDB from "@/app/lib/mongodb";
import Scheme from "@/app/models/Scheme";
import User from "@/app/models/User";
import fallbackSchemes from "@/app/data/schemes.json";
import bcrypt from "bcryptjs";
import { verifyAuth, checkRateLimit, getClientIp } from "@/app/lib/auth";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(`seed:${ip}`, 5, 60 * 60 * 1000)) {
      return new Response(JSON.stringify({ success: false, error: "Too many seed attempts" }), { status: 429, headers: { "Content-Type": "application/json" } });
    }
    // Protect seed: require auth or SEED_SECRET header (for CI). Allow in dev if JWT missing but warn.
    const auth = await verifyAuth(request as any);
    const seedSecret = process.env.SEED_SECRET;
    const providedSecret = request.headers.get("x-seed-secret");
    const isAuthorized = !!auth || (seedSecret && providedSecret === seedSecret);
    // In production, require auth; in dev allow but log
    if (!isAuthorized && process.env.NODE_ENV === "production") {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized — seed requires login or x-seed-secret" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    if (!isAuthorized) console.warn("Seed called without auth (dev mode allowed)");

    await connectDB();

    // Seed / sync schemes - upsert all from fallbackSchemes (94 schemes)
    let schemeCount = await Scheme.countDocuments();
    const bulkOps = fallbackSchemes.map((s: any) => ({
      updateOne: {
        filter: { schemeId: s.id },
        update: {
          $set: {
            schemeId: s.id,
            name: s.name,
            name_hi: s.name_hi,
            description: s.description,
            description_hi: s.description_hi,
            eligibility: s.eligibility,
            benefits: s.benefits,
            benefits_hi: s.benefits_hi,
            documents_required: s.documents_required,
            documents_required_hi: s.documents_required_hi,
            category: s.category,
            state_coverage: s.state_coverage,
          },
        },
        upsert: true,
      },
    }));
    if (bulkOps.length > 0) {
      await Scheme.bulkWrite(bulkOps);
    }
    schemeCount = await Scheme.countDocuments();

    // Seed demo user (only if not exists)
    let demo = await User.findOne({ email: "demo@welfare.gov.in" });
    if (!demo) {
      const hashed = await bcrypt.hash("demo123", 10);
      demo = await User.create({ email: "demo@welfare.gov.in", password: hashed, name: "Demo User", role: "user" } as any);
    }
    // Seed admin user
    let admin = await User.findOne({ email: "admin@welfare.gov.in" });
    if (!admin) {
      const hashedAdmin = await bcrypt.hash("Admin1234", 10);
      admin = await User.create({ email: "admin@welfare.gov.in", password: hashedAdmin, name: "Admin", role: "admin" } as any);
    } else if ((admin as any).role !== "admin") {
      (admin as any).role = "admin";
      await admin.save();
    }
    // Ensure admin password is Admin1234 if env says reset (for hackathon)
    // Seed customer service staff
    let staff = await User.findOne({ email: "staff@welfare.gov.in" });
    if (!staff) {
      const hashedStaff = await bcrypt.hash("Staff1234", 10);
      staff = await User.create({ email: "staff@welfare.gov.in", password: hashedStaff, name: "Customer Service", role: "staff" } as any);
    }

    return new Response(
      JSON.stringify({ success: true, schemes: schemeCount, demoUser: demo.email, adminUser: admin.email, staffUser: staff?.email }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Seed error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
