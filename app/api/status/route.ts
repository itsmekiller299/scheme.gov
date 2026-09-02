import connectDB from "@/app/lib/mongodb";
import Grievance from "@/app/models/Grievance";
import Scheme from "@/app/models/Scheme";
import User from "@/app/models/User";
import mongoose from "mongoose";

export async function GET() {
  try {
    await connectDB();
    const state = mongoose.connection.readyState; // 1 = connected
    const [users, schemes, grievances] = await Promise.all([
      User.countDocuments(),
      Scheme.countDocuments(),
      Grievance.countDocuments(),
    ]);
    const dbName = mongoose.connection.db?.databaseName || "hackathon-ai-welfare";
    return new Response(
      JSON.stringify({
        success: true,
        connected: state === 1,
        dbName,
        collections: { users, schemes, grievances },
        // URI intentionally not exposed for security; only dbName shown
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    // On Vercel, local MONGODB_URI (127.0.0.1) is unreachable — degrade gracefully with JSON fallback
    const isVercel = !!process.env.VERCEL;
    const uri = process.env.MONGODB_URI || "";
    const isLocalUri = uri.includes("127.0.0.1") || uri.includes("localhost");
    if (isVercel && isLocalUri) {
      const fallbackSchemes = (await import("@/app/data/schemes.json")).default as any[];
      return new Response(
        JSON.stringify({
          success: true,
          connected: false,
          degraded: true,
          dbName: "hackathon-ai-welfare (json fallback)",
          collections: { users: 3, schemes: fallbackSchemes.length, grievances: 0 },
          warning: "MONGODB_URI is local (127.0.0.1) — unreachable on Vercel. Set Atlas URI: vercel env add MONGODB_URI production → mongodb+srv://user:pass@cluster.mongodb.net/hackathon-ai-welfare",
          fix: "Create free Atlas at https://www.mongodb.com/cloud/atlas → Create → Free → Connect → Node.js → copy URI → vercel env add MONGODB_URI production --sensitive → vercel --prod --yes",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({
        success: false,
        connected: false,
        error: "DB unavailable",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
