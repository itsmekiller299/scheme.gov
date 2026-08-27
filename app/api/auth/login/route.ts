import connectDB from "@/app/lib/mongodb";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";
import { signToken, authCookieOptions, checkRateLimit, getClientIp } from "@/app/lib/auth";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
      return new Response(JSON.stringify({ success: false, error: "Too many login attempts, try later" }), {
        status: 429, headers: { "Content-Type": "application/json" },
      });
    }
    const { email, password } = await request.json();
    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return new Response(JSON.stringify({ success: false, error: "Email and password required" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6 || password.length > 128) {
      return new Response(JSON.stringify({ success: false, error: "Invalid email or password" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }
    await connectDB();

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user && email.toLowerCase() === "demo@welfare.gov.in" && password === "demo123") {
      const hashed = await bcrypt.hash(password, 10);
      user = await User.create({ email: email.toLowerCase(), password: hashed, name: "Demo User" });
    }

    if (!user) {
      return new Response(JSON.stringify({ success: false, error: "Invalid email or password" }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return new Response(JSON.stringify({ success: false, error: "Invalid email or password" }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });
    }

    const token = signToken({ id: String(user._id), email: user.email, name: user.name, role: (user as any).role || "user" });
    const cookieOpts = authCookieOptions();
    const cookie = `token=${token}; Path=${cookieOpts.path}; HttpOnly; SameSite=${cookieOpts.sameSite}; Max-Age=${cookieOpts.maxAge}${cookieOpts.secure ? "; Secure" : ""}`;

    return new Response(
      JSON.stringify({ success: true, user: { id: user._id, email: user.email, name: user.name, role: (user as any).role } }),
      { status: 200, headers: { "Content-Type": "application/json", "Set-Cookie": cookie } }
    );
  } catch (err) {
    console.error("Login error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
