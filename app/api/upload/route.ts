import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";

// Ensure upload dir exists
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function ensureDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch {}
}

export async function POST(request: NextRequest) {
  try {
    await ensureDir();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const docName = (formData.get("docName") as string) || "document";

    if (!file) {
      return new Response(JSON.stringify({ success: false, error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validation: 5MB max
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ success: false, error: "File too large (max 5MB)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"];
    // Allow any if not in strict list but warn - for demo allow all
    // if (!allowed.includes(file.type)) { ... }

    const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
    const safeDoc = docName.replace(/[^a-zA-Z0-9-_]/g, "_");
    const fileName = `${Date.now()}-${safeDoc}${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const url = `/uploads/${fileName}`;
    const stats = await fs.stat(filePath);

    return new Response(
      JSON.stringify({
        success: true,
        url,
        fileName,
        originalName: file.name,
        docName,
        size: stats.size,
        type: file.type,
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Upload error:", err);
    return new Response(JSON.stringify({ success: false, error: "Upload failed: " + (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET() {
  try {
    await ensureDir();
    const files = await fs.readdir(UPLOAD_DIR);
    const list = await Promise.all(
      files.slice(0, 20).map(async (f) => {
        const stat = await fs.stat(path.join(UPLOAD_DIR, f));
        return { file: f, url: `/uploads/${f}`, size: stat.size, mtime: stat.mtime };
      })
    );
    return new Response(JSON.stringify({ success: true, files: list }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
