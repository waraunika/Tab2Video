import { randomUUID } from "crypto";
import { existsSync, mkdirSync } from "fs";
import { unlink, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

const STORE_DIR = "temporary_files"
const TEMP_DIR = path.join(process.cwd(), "public", STORE_DIR);

function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureTempDir();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({
        error: "No file provided"
      }, {
        status: 400
      });
    }

    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    const tempFileName = `${randomUUID()}${ext}`;
    const filePath = path.join(TEMP_DIR, tempFileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return NextResponse.json({
      tempFileName,
      fileUrl: `/${STORE_DIR}/${tempFileName}`,
    });
  } catch (error) {
    console.error("[temp upload error: ", error);
    return NextResponse.json({
      error: "Failed to write temp file"
    }, {
      status: 500
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { tempFileName } = await req.json();

    if (!tempFileName || tempFileName.includes("..") || tempFileName.includes("/")) {
      return NextResponse.json({
        error: "Invalid file name"
      }, {
        status: 400
      });
    }

    const filePath = path.join(TEMP_DIR, tempFileName);

    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error("[temp delete error]: ", error);
    return NextResponse.json({
      error: "Failed to delete temp file"
    }, {
      status: 500
    })
  }
}