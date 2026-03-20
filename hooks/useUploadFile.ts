"use client";

import { useCallback, useState } from "react";
import { TabFileData, TabUploadResponse } from "@/types/TabFile";

interface UseUploadFileReturn {
  fileUrl: string | null;
  fileName: string | null;
  storagePath: string | null;
  isUploading: boolean;
  error: string | null;
  uploadTabFile: (file: File, fileData: TabFileData) => Promise<void>;
}

export function useUploadFile(): UseUploadFileReturn {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadTabFile = useCallback(
    async (file: File, fileData: TabFileData) => {
      setIsUploading(true);
      setError(null);

      try {
        if (file) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("fileData", JSON.stringify(fileData));

          const res = await fetch("/api/tabs/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error ?? "Upload Failed");
          }

          const { fileUrl, fileName, storagePath }: TabUploadResponse =
            await res.json();
          setFileUrl(fileUrl);
          setFileName(fileName);
          setStoragePath(storagePath);
        }
      } catch (error) {
        setError("Unknown error");
        console.log(error);
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  return { fileUrl, fileName, storagePath, isUploading, error, uploadTabFile };
}
