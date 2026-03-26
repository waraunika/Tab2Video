// app/edit-tab/page.tsx (Updated with save functionality)
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import AlphaTabViewer from "@/components/tabs/AlphaTabViewer";
import { Button } from "@/components/ui/button";
import { Save, ArrowLeft, X } from "lucide-react";
import Link from "next/link";

export default function EditTabPage() {
  const params = useSearchParams();
  const router = useRouter();
  const fileUrl = params.get("url")
    ? decodeURIComponent(params.get("url")!)
    : null;
  const tabId = params.get("tabId");
  const title = params.get("title") ?? "Edit Tab";
  const [isSaving, setIsSaving] = useState(false);
  const [currentContent, setCurrentContent] = useState<string>("");
  const supabase = createClient();

  const handleContentChange = (content: string) => {
    setCurrentContent(content);
  };

  const handleSave = async () => {
    if (!tabId || !currentContent) {
      alert("No content to save");
      return;
    }

    setIsSaving(true);
    try {
      // Get the current file path from the database
      const { data: tab, error: fetchError } = await supabase
        .from("tabs")
        .select("file_path")
        .eq("id", tabId)
        .single();

      if (fetchError) throw fetchError;

      // Upload the edited content back to storage
      const { error: uploadError } = await supabase.storage
        .from("tabs")
        .update(tab.file_path, currentContent, {
          contentType: "text/plain",
        });

      if (uploadError) throw uploadError;

      // Update the updated_at timestamp
      await supabase
        .from("tabs")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", tabId);

      alert("Tab saved successfully!");
      router.push("/my-tabs");
    } catch (error) {
      console.error("Error saving tab:", error);
      alert("Failed to save tab. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!fileUrl || !tabId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">No tab selected for editing</p>
        <Button onClick={() => router.push("/my-tabs")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Tabs
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold ">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close and go to home"
          >
            <X className="h-5 w-5" />
          </Link>
        </div>
        {/* <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button> */}
      </div>

      <AlphaTabViewer
        fileUrl={fileUrl}
        editorModeAvailable={true}
        onContentChange={handleContentChange}
      />
    </div>
  );
}
