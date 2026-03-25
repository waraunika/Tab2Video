import { createClient } from "@/lib/supabase/server";
import { TabFileData } from "@/types/TabFile";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fileDataString = formData.get("fileData") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No File provided" }, { status: 400 });
    }

    if (!fileDataString) {
      return NextResponse.json(
        { error: "No file data included" },
        { status: 400 },
      );
    }

    let fileData: TabFileData;
    try {
      fileData = JSON.parse(fileDataString) as TabFileData;
    } catch (parseError) {
      console.log(parseError);
      return NextResponse.json(
        { error: "Invalid file format" },
        { status: 400 },
      );
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB" },
        { status: 400 },
      );
    }

    const timestamp = Date.now();
    const uniqueId = randomUUID();
    const santizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storageFileName = `${user.id}/${timestamp}-${uniqueId}-${santizedFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("user-tabs")
      .upload(storageFileName, buffer, {
        contentType: file.type || "application/octet-streaam",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error: ", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 },
      );
    }

    const { data: dbData, error: dbError } = await supabase
      .from("tabs")
      .insert({
        title: fileData.title.replace(/\.[^/.]+$/, ""),
        artist: fileData.artist,
        album: fileData.album,
        file_path: storageFileName,
        created_by: user.id,
        is_public: fileData.is_public,
      });

    if (dbError) {
      console.error("Database insert error: ", dbError);
      await supabase.storage.from("user-tabs").remove([storageFileName]);

      return NextResponse.json(
        { error: "Failed to save tab metadata" },
        { status: 500 },
      );
    }

    console.log(dbData, "\n Database insert successful");

    const { data: storageData, error } = await supabase.storage
      .from("user-tabs")
      .createSignedUrl(storageFileName, 3600);

    if (error) {
      console.error(error);
      return NextResponse.json({
        fileUrl: null,
        fileName: file.name,
        storagePath: storageFileName,
        message: "File uploaded but preview unavailable",
      });
    }

    return NextResponse.json({
      fileUrl: storageData.signedUrl,
      fileName: file.name,
      storagePath: storageFileName,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.log("Unnexpected error: ", error);
    return NextResponse.json(
      { error: "An unexpected error occured" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
