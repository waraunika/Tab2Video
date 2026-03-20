"use client";

import { FileUp } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface FileUploaderProps {
  onFileLoaded: (file: File) => void;
}

const validExtensions = [
  ".gp",
  ".gpx",
  ".gp3",
  ".gp4",
  ".gp5",
  ".gp6",
  ".gp7",
  ".gp8",
  ".musicxml",
  ".xml",
  ".tef",
];

export default function FileUploader({ onFileLoaded }: FileUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const extesnion = file.name
        .substring(file.name.lastIndexOf("."))
        .toLowerCase();

      if (!validExtensions.includes(extesnion)) {
        setError(
          "Invalaid file type. Please upload a guitar pro or musicxml file.",
        );
        return;
      }

      setError(null);
      onFileLoaded(file);
    },
    [onFileLoaded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/octet-stream": [
        ".gp",
        ".gpx",
        ".gp3",
        ".gp4",
        ".gp5",
        ".gp6",
        ".gp7",
        ".gp8",
      ],
      "application/xml": [".musicxml", ".xml"],
      "text/xml": [".tef"],
    },
    maxFiles: 1,
  });

  return (
    <div className="w-full mx-auto p-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${
            isDragActive
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
              : "border-zinc-400 dark:border-zinc-700"
          }
          hover:border-blue-400 dark:hover:border-blue-600
          `}
      >
        <input {...getInputProps()} />

        <FileUp className="m-auto" size={50} strokeWidth={1} />

        <p className="mt-4 text-lg font-medium text-zinc-700 dark:Text-zinc-300">
          {isDragActive ? "Drop your tab here" : "Drag & drop your tab file"}
        </p>
        
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500 dark:Text-zinc-400">
          or click to browse (GP3, GP4, GP5, GPX, MusicXML)
        </p>

        {error && (
          <p className="mt-3 text-sm text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}
