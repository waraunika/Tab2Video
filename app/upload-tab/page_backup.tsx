"use client";

import AlphaTabViewer from "@/components/tabs/AlphaTabViewer";
import FileUploader from "@/components/tabs/FileUploader";
import { Button } from "@/components/ui/button";
import { useTempTabFile } from "@/hooks/useTempTabFile";
import { useState } from "react";

export default function UploadTabs() {
  const { fileUrl, isUploading, error, uploadTempFile, cleanupTempFile } = useTempTabFile();

  const [currentFileName, setCurrentFileName] = useState<string | null>(null);

  async function handleFileLoaded(file: File) {
    setCurrentFileName(file.name);
    await uploadTempFile(file);
  }

  async function handleCancel() {
    await cleanupTempFile();
    setCurrentFileName(null);
  }

  async function handleSave() {
    console.log(`[supabase storage] Storing tab "${currentFileName}" from temp URL: ${fileUrl}`);
    alert("Tab saved");
  }

  if (!fileUrl && !isUploading) {
    return <FileUploader onFileLoaded={handleFileLoaded} />;
  }

  if (isUploading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 dark:text-zinc-400 text-sm">
        Uploading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500 text-sm">
          {error}
        </p>
        
        <Button variant={"outline"} onClick={handleCancel}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-xs">
          {currentFileName}
        </h2>

        <div className="flex gap-3">
          <Button onClick={handleCancel} variant={"destructive"}>
            Cancel
          </Button>

          <Button onClick={handleSave} variant={"default"}>
            Save Tab
          </Button>
        </div>
      </div>

      {fileUrl && (
        <AlphaTabViewer
          fileUrl={"/file.gp3"}
        />
      )}
    </div>
  );
}
