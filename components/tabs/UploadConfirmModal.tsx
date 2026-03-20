// components/tabs/UploadConfirmModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Input } from "../ui/input";
import Modal from "../ui/modal";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { TabFileData } from "@/types/TabFile";
import { AlertCircle, Music, User, Album, Globe } from "lucide-react";

interface UploadConfirmModalProps {
  isOpen: boolean;
  handleConfirmUpload: (fileData: TabFileData) => Promise<void>;
  handleCancel: () => void;
  fileName: string;
  isUploading?: boolean;
}

export default function UploadConfirmModal({
  isOpen,
  handleConfirmUpload,
  handleCancel,
  fileName,
  isUploading = false,
}: UploadConfirmModalProps) {
  const [fileData, setFileData] = useState<TabFileData>({
    title: fileName.replace(/\.[^/.]+$/, ""), // Remove extension for title
    artist: "",
    album: "",
    is_public: false,
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof TabFileData, string>>
  >({});

  // Reset form when modal opens with new file
  useEffect(() => {
    if (isOpen) {
      setFileData({
        title: fileName.replace(/\.[^/.]+$/, ""),
        artist: "",
        album: "",
        is_public: false,
      });
      setErrors({});
    }
  }, [isOpen, fileName]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TabFileData, string>> = {};

    if (!fileData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!fileData.artist.trim()) {
      newErrors.artist = "Artist is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    await handleConfirmUpload(fileData);
  };

  const handleInputChange = (
    field: keyof TabFileData,
    value: string | boolean,
  ) => {
    setFileData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Modal
      title="Confirm Upload Details"
      isOpen={isOpen}
      onClose={handleCancel}
      showCloseButton
      closeOnClickOutside={!isUploading}
    >
      <div className="space-y-6 py-4">
        {/* File info banner */}
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            Selected File
          </p>
          <p className="text-sm truncate font-mono">{fileName}</p>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={fileData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Enter tab title"
              disabled={isUploading}
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                {errors.title}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="artist" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Artist <span className="text-destructive">*</span>
            </Label>
            <Input
              id="artist"
              value={fileData.artist}
              onChange={(e) => handleInputChange("artist", e.target.value)}
              placeholder="Enter artist name"
              disabled={isUploading}
              className={errors.artist ? "border-destructive" : ""}
            />
            {errors.artist && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                {errors.artist}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="album" className="flex items-center gap-2">
              <Album className="h-4 w-4" />
              Album{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="album"
              value={fileData.album}
              onChange={(e) => handleInputChange("album", e.target.value)}
              placeholder="Enter album name"
              disabled={isUploading}
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Label
              htmlFor="is_public"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Globe className="h-4 w-4" />
              Make this tab public
            </Label>
          </div>
          <div className="flex items-start pl-2">
            <Checkbox
              id="is_public"
              checked={fileData.is_public}
              onCheckedChange={(checked) =>
                handleInputChange("is_public", checked === true)
              }
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground pl-2">
              Public tabs will be visible to everyone using this website.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isUploading}>
            {isUploading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Uploading...
              </>
            ) : (
              "Upload Tab"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
