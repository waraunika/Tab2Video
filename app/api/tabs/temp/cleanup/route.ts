import { existsSync } from "fs";
import { unlink } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

const STORE_DIR = "temporary_files"
const TEMP_DIR = path.join(process.cwd(), "public", STORE_DIR);

export async function POST(req: NextRequest) {
  try {
    const { tempFileName } = await req.json();

    if (!tempFileName || tempFileName.includes("..") || tempFileName.includes("/")) {
      return NextResponse.json({
        error: "Invalid Filename"
      }, {
        status: 400
      });
    }

    const filePath = path.join(TEMP_DIR, tempFileName);
    
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    return NextResponse.json({ sucess: true});
  } catch (error) {
    console.error("[beacon cleanup error]: ", error);
    return NextResponse.json({
      error: "Cleanup failed"
    }, {
      status: 500
    })
  }
}