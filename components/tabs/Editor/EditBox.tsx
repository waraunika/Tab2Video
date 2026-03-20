"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, Copy, Download, SquareArrowRight } from "lucide-react";
import { AlphaTabApi } from "@coderline/alphatab";
import * as alphaTab from '@coderline/alphatab';
import { useTheme } from "next-themes";

interface EditBoxProps {
  value: string;
  onChange: (value: string) => void;
  apiRef: AlphaTabApi | null;
}

const lightTheme = {
  staffLineColor: "#e4e4e7",
  barSeparatorColor: "#a1a1aa",
  mainGlyphColor: "#27272a",
  secondaryGlyphColor: "#44403c",
  scoreInfoColor: "#18181b",
  barNumberColor: "#828291",
};

const darkTheme = {
  staffLineColor: "#44403c",
  barSeparatorColor: "#828291",
  mainGlyphColor: "#f4f4f5",
  secondaryGlyphColor: "#e4e4e7",
  scoreInfoColor: "#ffffff",
  barNumberColor: "#d4d4d8",
};

export default function EditBox({
  value,
  onChange,
  apiRef
}: EditBoxProps) {
  const [fontSize, setFontSize] = useState(14);
  const { resolvedTheme } = useTheme();

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
  };

  const handleSave = () => {
    // Implement save functionality
    localStorage.setItem('alphatex-draft', value);
  };

  const handleDownload = () => {
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'score.alphatex';
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
      const getThemeColors = () => {
        return resolvedTheme === "dark" ? darkTheme : lightTheme;
      };
  
      const updateTheme = () => {
        if (!apiRef) return;
  
        const colors = getThemeColors();
        apiRef.settings.display.resources.staffLineColor =
          alphaTab.model.Color.fromJson(colors.staffLineColor)!;
        apiRef.settings.display.resources.barSeparatorColor =
          alphaTab.model.Color.fromJson(colors.barSeparatorColor)!;
        apiRef.settings.display.resources.mainGlyphColor =
          alphaTab.model.Color.fromJson(colors.mainGlyphColor)!;
        apiRef.settings.display.resources.secondaryGlyphColor =
          alphaTab.model.Color.fromJson(colors.secondaryGlyphColor)!;
        apiRef.settings.display.resources.scoreInfoColor =
          alphaTab.model.Color.fromJson(colors.scoreInfoColor)!;
        apiRef.settings.display.resources.barNumberColor =
          alphaTab.model.Color.fromJson(colors.barNumberColor)!;
  
        apiRef.updateSettings();
        apiRef.render();
      };
  
      if (apiRef) {
        if (!apiRef) return;
        updateTheme();
      }
    }, [resolvedTheme, apiRef]);

  const handleCompile = () => {
    if (apiRef) {
      apiRef.tex(value);
      apiRef.render();
    }
  }

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-900">
      {/* Editor toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            AlphaTeX Editor
          </span>
          <select 
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="text-xs bg-transparent border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1"
          >
            <option value={12}>12px</option>
            <option value={14}>14px</option>
            <option value={16}>16px</option>
            <option value={18}>18px</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant={"secondary"} size="sm" onClick={handleCompile}>
            <SquareArrowRight />
          </Button>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-hidden p-4">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full font-mono bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          style={{ fontSize: `${fontSize}px` }}
          placeholder="Enter your AlphaTeX here..."
          spellCheck={false}
        />
      </div>

      {/* Status bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          Lines: {value.split('\n').length} | Characters: {value.length}
        </span>
        <span>
          AlphaTeX syntax
        </span>
      </div>
    </div>
  );
}