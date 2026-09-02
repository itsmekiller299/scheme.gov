import connectDB from "@/app/lib/mongodb";
import Application from "@/app/models/Application";
import Scheme from "@/app/models/Scheme";
import Grievance from "@/app/models/Grievance";
import CustomerTicket from "@/app/models/CustomerTicket";
import { getGemini, hasGeminiKey, GEMINI_MODEL } from "@/app/lib/gemini";
import { verifyAuth } from "@/app/lib/auth";

export async function GET(request: Request) {
  try {
    await connectDB();
    // Allow public demo but gate detailed if needed — check optional auth
    const auth = await verifyAuth(request as any);
    const isAdmin = auth?.role === "admin" || auth?.role === "staff";

    const [byCategory, byState, byStatus, recentApps, totalApps, totalSchemes, totalGrievances, openTickets] = await Promise.all([
      Application.aggregate([{ $group: { _id: "$schemeId", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 6 }]),
      Application.aggregate([{ $group: { _id: "$state", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 6 }]),
      Application.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Application.find().sort({ createdAt: -1 }).limit(5).lean(),
      Application.countDocuments(),
      Scheme.countDocuments(),
      Grievance.countDocuments(),
      CustomerTicket.countDocuments({ status: { $in: ["open", "in_progress", "waiting"] } }),
    ]);

    const stats = { totalApps, totalSchemes, totalGrievances, openTickets, byCategory, byState, byStatus };

    // Gemini-generated executive summary
    let aiSummary: string | null = null;
    const genAI = getGemini();
    if (genAI && hasGeminiKey()) {
      try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const prompt = `You are gov analytics AI for scheme.gov. Data: ${JSON.stringify(stats).slice(0, 3000)}. Recent: ${recentApps.map((a: any) => a.schemeName).join(", ")}. Write 4 bullet insights in English for admin: trends, bottlenecks, fraud risk, next action. Keep under 180 words.`;
        const r = await model.generateContent(prompt);
        aiSummary = r.response.text().trim().slice(0, 900);
      } catch (e) {
        aiSummary = "AI insights unavailable: " + (e as Error).message;
      }
    } else {
      // Rule-based fallback
      const topCat = byCategory[0]?._id || "none";
      aiSummary = `Demo Insights (add GEMINI_API_KEY for Gemini 2.5 Flash reasoning — verify: GET /api/ai/verify):
• Top scheme: ${topCat} (${byCategory[0]?.count || 0} applications)
• Applications: ${totalApps} total, status breakdown: ${byStatus.map((s: any) => `${s._id}:${s.count}`).join(", ") || "none"}
• States active: ${byState.map((s: any) => s._id).join(", ") || "none yet"} — consider outreach in low-uptake states
• ${openTickets} open tickets need attention; auto-reply via Gemini recommended`;
    }

    return new Response(JSON.stringify({ success: true, ...stats, aiSummary, model: hasGeminiKey() ? GEMINI_MODEL : "rule-based-demo", isAdmin }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("insights error", e);
    return new Response(JSON.stringify({ success: false, error: "Insights failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
