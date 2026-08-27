import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { verifyAuth } from "@/app/lib/auth";

// Ensure upload dir exists
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function ensureDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch {}
}

const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"]);
const ALLOWED_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp"]);

// Simple in-memory rate limiter for upload: 20 uploads per 10min per IP
const uploadRate = new Map<string, number[]>();
function checkUploadRate(ip: string): boolean {
  const now = Date.now();
  const arr = (uploadRate.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (arr.length >= 20) return false;
  arr.push(now);
  uploadRate.set(ip, arr);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Require auth for upload (PII documents)
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized — please login" }, { status: 401 });
    }

    // Rate limit
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    if (!checkUploadRate(ip)) {
      return NextResponse.json({ success: false, error: "Too many uploads, try later" }, { status: 429 });
    }

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

    const mime = file.type?.toLowerCase() || "";
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json({ success: false, error: `Invalid file type: ${mime}. Allowed: PDF, JPG, PNG, WebP` }, { status: 400 });
    }

    let ext = path.extname(file.name).toLowerCase();
    if (!ext) ext = mime === "application/pdf" ? ".pdf" : ".jpg";
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json({ success: false, error: `Invalid file extension: ${ext}` }, { status: 400 });
    }
    // Mime <-> ext consistency
    const mimeForExt: Record<string, string[]> = {
      ".pdf": ["application/pdf"],
      ".jpg": ["image/jpeg", "image/jpg"],
      ".jpeg": ["image/jpeg", "image/jpg"],
      ".png": ["image/png"],
      ".webp": ["image/webp"],
    };
    if (!mimeForExt[ext]?.includes(mime)) {
      return NextResponse.json({ success: false, error: `Extension ${ext} does not match mime ${mime}` }, { status: 400 });
    }

    const safeDoc = docName.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 30);
    const rand = crypto.randomBytes(6).toString("hex");
    const fileName = `${Date.now()}-${rand}-${safeDoc}${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    // Prevent path traversal: ensure resolved path stays inside UPLOAD_DIR
    if (!filePath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ success: false, error: "Invalid file path" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Reject HTML/JS masquerading: first bytes check for <html, <?php etc. (basic)
    const head = buffer.subarray(0, 512).toString("utf8").toLowerCase();
    if (head.includes("<html") || head.includes("<script") || head.includes("<?php")) {
      return NextResponse.json({ success: false, error: "Executable content not allowed" }, { status: 400 });
    }
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

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
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
