import connectDB from "@/app/lib/mongodb";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";
import { signToken, authCookieOptions, checkRateLimit, getClientIp } from "@/app/lib/auth";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(`register:${ip}`, 5, 15 * 60 * 1000)) {
      return new Response(JSON.stringify({ success: false, error: "Too many registrations, try later" }), {
        status: 429, headers: { "Content-Type": "application/json" },
      });
    }
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ success: false, error: parsed.error.issues[0]?.message || "Invalid input" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }
    const { email, password, name } = parsed.data;
    // Enforce stronger password: at least 8 chars, letters+numbers
    if (password.length < 8 || password.length > 128) {
      return new Response(JSON.stringify({ success: false, error: "Password must be 8-128 characters" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }
    await connectDB();
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return new Response(JSON.stringify({ success: false, error: "User already exists" }), {
        status: 409, headers: { "Content-Type": "application/json" },
      });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email: email.toLowerCase(), password: hashed, name: name?.trim(), role: "user" } as any);

    const token = signToken({ id: String(user._id), email: user.email, name: user.name, role: (user as any).role });
    const cookieOpts = authCookieOptions();
    const cookie = `token=${token}; Path=${cookieOpts.path}; HttpOnly; SameSite=${cookieOpts.sameSite}; Max-Age=${cookieOpts.maxAge}${cookieOpts.secure ? "; Secure" : ""}`;

    return new Response(JSON.stringify({ success: true, user: { id: user._id, email: user.email, name: user.name, role: (user as any).role } }), {
      status: 201, headers: { "Content-Type": "application/json", "Set-Cookie": cookie },
    });
  } catch (err) {
    console.error("Register error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
