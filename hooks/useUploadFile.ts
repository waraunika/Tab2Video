'use client';

import { useCallback, useRef, useState } from "react";

interface UseUploaadFileReturn {
  fileUrl: string | null;
  fileName: string | null;
  isUploading: boolean;
  error: string | null;
  uploadTabFile: (file: File) => Promise<void>;
}

export function useUploadFile(): UseUploaadFileReturn {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileNameRef = useRef<string | null>(null);
  fileNameRef.current = fileName;

  const uploadTabFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch('/api/tabs/upload', {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload Failed");
      }

      const { fileUrl, fileName } = await res.json();
      setFileUrl(fileUrl);
      setFileName(fileName);
    } catch (error) {
      setError(error + "Unknown error");
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { fileUrl, fileName, isUploading, error, uploadTabFile};
}