import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import * as fs from "fs";
import * as path from "path";

const BACKUP_DIR = process.env.BACKUP_DIR || "./backups";

// GET download a backup file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER and MANAGER can download backups
    if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { filename } = await params;

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filepath = path.join(BACKUP_DIR, sanitizedFilename);

    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filepath);
    const contentType = filename.endsWith(".sql")
      ? "application/sql"
      : "application/json";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${sanitizedFilename}"`,
      },
    });
  } catch (error) {
    console.error("Error downloading backup:", error);
    return NextResponse.json(
      { error: "Failed to download backup" },
      { status: 500 }
    );
  }
}

// DELETE a backup file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER can delete backups
    if (!["OWNER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { filename } = await params;

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filepath = path.join(BACKUP_DIR, sanitizedFilename);

    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }

    fs.unlinkSync(filepath);

    return NextResponse.json({ success: true, message: "Backup deleted" });
  } catch (error) {
    console.error("Error deleting backup:", error);
    return NextResponse.json(
      { error: "Failed to delete backup" },
      { status: 500 }
    );
  }
}
