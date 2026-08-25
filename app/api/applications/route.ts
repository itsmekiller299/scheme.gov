import connectDB from "@/app/lib/mongodb";
import Application from "@/app/models/Application";

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    const required = ["schemeId", "schemeName", "applicantName", "email", "phone", "documents_required"];
    for (const f of required) {
      if (!body[f]) {
        return new Response(JSON.stringify({ success: false, error: `${f} is required` }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Build documents array from checklist
    const docs = (body.documents_required as string[]).map((name: string) => ({
      name,
      provided: body.documents?.[name] === true || body.documents?.includes?.(name) || false,
    }));

    const appDoc = await Application.create({
      schemeId: body.schemeId,
      schemeName: body.schemeName,
      applicantName: body.applicantName,
      email: body.email.toLowerCase(),
      phone: body.phone,
      aadhaarLast4: body.aadhaarLast4 || null,
      state: body.state || null,
      income: body.income ? Number(body.income) : undefined,
      address: body.address || null,
      documents: docs,
      documents_required: body.documents_required,
      status: "submitted",
    });

    return new Response(
      JSON.stringify({ success: true, applicationId: appDoc._id, application: appDoc }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Application POST error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const email = searchParams.get("email");

    if (id) {
      const doc = await Application.findById(id).lean();
      if (!doc) {
        return new Response(JSON.stringify({ success: false, error: "Application not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, application: doc }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // List by email or latest 20
    const filter: Record<string, unknown> = {};
    if (email) filter.email = email.toLowerCase();
    const list = await Application.find(filter).sort({ createdAt: -1 }).limit(20).lean();
    return new Response(JSON.stringify({ success: true, applications: list }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Application GET error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
