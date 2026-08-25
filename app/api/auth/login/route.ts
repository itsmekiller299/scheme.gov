import connectDB from "@/app/lib/mongodb";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ success: false, error: "Email and password required" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }
    await connectDB();

    let user = await User.findOne({ email: email.toLowerCase() });

    // Auto-create demo user for hackathon ease: demo@welfare.gov.in / demo123
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

    return new Response(
      JSON.stringify({ success: true, user: { id: user._id, email: user.email, name: user.name } }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Login error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
