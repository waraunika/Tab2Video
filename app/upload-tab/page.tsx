// app/upload-tab/page.tsx
"use client";

import AlphaTabViewer from "@/components/tabs/AlphaTabViewer";
import FileUploader from "@/components/tabs/FileUploader";
import UploadConfirmModal from "@/components/tabs/UploadConfirmModal";
import { Button } from "@/components/ui/button";
import { useUploadFile } from "@/hooks/useUploadFile";
import { TabFileData } from "@/types/TabFile";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function UploadTabs() {
  const router = useRouter();
  const { fileUrl, isUploading, error, uploadTabFile } = useUploadFile();
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [fileModalActive, setFileModalActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  async function handleFileLoaded(file: File) {
    setCurrentFileName(file.name);
    setFile(file);
    setFileModalActive(true);
  }

  async function handleConfirmUpload(fileData: TabFileData) {
    setFileModalActive(false);

    if (file) {
      await uploadTabFile(file, fileData);
    }
    setUploadSuccess(true);
  }

  function handleCancel() {
    setFileModalActive(false);
    setCurrentFileName(null);
  }

  function handleUploadAnother() {
    setCurrentFileName(null);
    setUploadSuccess(false);
    // Reset the upload state
    window.location.reload(); // Simple reset, or you could manage state more granularly
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Upload Tab</h1>
      </div>

      {/* No file yet — show uploader */}
      {!fileUrl && !isUploading && !error && !currentFileName && (
        <FileUploader onFileLoaded={handleFileLoaded} />
      )}

      {/* Upload Confirm Modal */}
      {currentFileName && (
        <UploadConfirmModal
          isOpen={fileModalActive}
          handleConfirmUpload={handleConfirmUpload}
          handleCancel={handleCancel}
          fileName={currentFileName}
          isUploading={isUploading}
        />
      )}

      {/* Uploading spinner */}
      {isUploading && (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Uploading your file to secure storage...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !isUploading && (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="p-4 bg-destructive/10 rounded-full">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-destructive text-sm font-medium">{error}</p>
          <Button onClick={handleUploadAnother} variant="outline">
            Try Again
          </Button>
        </div>
      )}

      {/* Viewer — only mounts once fileUrl is set and upload is complete */}
      {fileUrl && !isUploading && !error && (
        <div className="space-y-6">
          {/* File info bar */}
          <div className="bg-card rounded-lg p-4 border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Current file
              </p>
              <h2 className="text-lg font-semibold truncate max-w-xs sm:max-w-md">
                {currentFileName}
              </h2>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                onClick={handleUploadAnother}
                variant="outline"
                className="flex-1 sm:flex-initial"
              >
                Upload Another
              </Button>
            </div>
          </div>

          {/* AlphaTab Viewer */}
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <AlphaTabViewer
              fileUrl={fileUrl}
              fileName={currentFileName ?? undefined}
            />
          </div>

          {/* Info message */}
          <p className="text-xs text-muted-foreground text-center">
            You can edit and play your tab above. Click &quot;Save to
            Library&quot; when you&apos;re ready to add it to your collection.
          </p>
        </div>
      )}
    </div>
  );
}
