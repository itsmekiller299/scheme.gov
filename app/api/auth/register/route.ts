import connectDB from "@/app/lib/mongodb";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();
    if (!email || !password || password.length < 6) {
      return new Response(JSON.stringify({ success: false, error: "Email and password (min 6) required" }), {
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
    const user = await User.create({ email: email.toLowerCase(), password: hashed, name });
    return new Response(JSON.stringify({ success: true, user: { id: user._id, email: user.email, name: user.name } }), {
      status: 201, headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Register error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
