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
        uri: process.env.MONGODB_URI?.replace(/\/\/.*@/, "//***@") || "mongodb://127.0.0.1:27017/hackathon-ai-welfare",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        connected: false,
        error: (err as Error).message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
