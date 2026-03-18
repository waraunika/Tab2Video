"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseTempTabFileReturn {
  fileUrl: string | null;
  tempFileName: string | null;
  isUploading: boolean;
  error: string | null;
  uploadTempFile: (file: File) => Promise<void>;
  cleanupTempFile: () => Promise<void>;
}

export function useTempTabFile(): UseTempTabFileReturn {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [tempFileName, setTempFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tempFileNameRef = useRef<string | null>(null);
  tempFileNameRef.current = tempFileName;

  const cleanupTempFile = useCallback(async () => {
    const name = tempFileNameRef.current;
    if (!name) return;

    try {
      await fetch("/api/tabs/temp", {
        method: "DELETE",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ tempFileName: name }),
      });
    } catch (error) {
      console.error("[useTempTabFile] cleanup failed: ", error);
    }

    setFileUrl(null);
    setTempFileName(null);
    tempFileNameRef.current = null;
  }, []);

  const uploadTempFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);

    await cleanupTempFile();

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/tabs/temp", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload failed");
      }

      const { fileUrl, tempFileName } = await res.json();
      setFileUrl(fileUrl);
      setTempFileName(tempFileName);
    } catch (error) {
      setError(error.message ?? "Unkown error");
    } finally {
      setIsUploading(false);
    }
  }, [cleanupTempFile]);

  useEffect(() => {
    return () => {
      const name = tempFileNameRef.current;
      if (!name) return;

      fetch("/api/tabs/temp", {
        method: "DELETE",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({ tempFileName: name }),
      }).catch(() => {});
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const name = tempFileNameRef.current;
      if (!name) return;

      const blob = new Blob([
        JSON.stringify({ tempFileName: name })
      ], {
        type: "application/json"
      });
      navigator.sendBeacon("/api/tabs/temp/cleanup", blob);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return { fileUrl, tempFileName, isUploading, error, uploadTempFile, cleanupTempFile };
}