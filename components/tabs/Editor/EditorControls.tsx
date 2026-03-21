"use client";

import { Button } from "@/components/ui/button";
import { Copy, Save, Download,SquareTerminal , Menu, X, Printer } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

interface EditorControlsProps {
  fontSize: number;
  setFontSize: (size: number) => void;
  handleCopy: () => void;
  handleSave: () => void;
  handleDownload: () => void;
  handleCompile: () => void;
  handlePrint?: () => void;
}

export default function EditorControls({ 
  fontSize, 
  setFontSize, 
  handleCopy, 
  handleSave, 
  handleDownload, 
  handleCompile,
  handlePrint 
}: EditorControlsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [hasShownAlert, setHasShownAlert] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalWidthRef = useRef<number>(0);
  const resizeTimerRef = useRef<NodeJS.Timeout>(null);
  const isInitializedRef = useRef(false);

  // Measure original width (100% width) on mount
  useEffect(() => {
    if (!isInitializedRef.current && containerRef.current) {
      const parentElement = containerRef.current.parentElement;
      if (parentElement) {
        originalWidthRef.current = parentElement.clientWidth;
      } else {
        originalWidthRef.current = containerRef.current.clientWidth;
      }
      isInitializedRef.current = true;
    }
  }, []);

  // Check if we need compact mode based on percentage threshold
  const checkCompactMode = useCallback(() => {
    if (containerRef.current && originalWidthRef.current > 0) {
      const currentWidth = containerRef.current.clientWidth;
      const percentage = (currentWidth / originalWidthRef.current) * 100;
      
      const shouldBeCompact = percentage <= 60;
      const shouldBeFull = percentage > 65;
      
      if (shouldBeCompact && !isCompact) {
        setIsCompact(true);
        setIsMenuOpen(false);
        
        if (!hasShownAlert) {
          alert("⚠️ Your screen size is smaller which makes your desired work to complete difficult. Editor controls have been moved to the menu button for better accessibility.");
          setHasShownAlert(true);
        }
      } else if (shouldBeFull && isCompact) {
        setIsCompact(false);
        setHasShownAlert(false);
      } else if (percentage > 60 && percentage <= 65 && !isCompact) {
        return;
      }
    }
  }, [isCompact, hasShownAlert]);

  // Debounced resize handler
  useEffect(() => {
    const handleResize = () => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
      resizeTimerRef.current = setTimeout(() => {
        checkCompactMode();
      }, 100);
    };

    const initialTimer = setTimeout(() => {
      checkCompactMode();
    }, 100);

    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(initialTimer);
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [checkCompactMode]);

  // Close menu when switching to full mode
  useEffect(() => {
    if (!isCompact) {
      setIsMenuOpen(false);
    }
  }, [isCompact]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const menuItems = [
    { icon: Copy, label: "Copy", action: handleCopy },
    { icon: Save, label: "Save", action: handleSave },
    { icon: Download, label: "Download", action: handleDownload },
    ...(handlePrint ? [{ icon: Printer, label: "Print", action: handlePrint }] : [])
  ];

  return (
    <div 
      ref={containerRef}
      className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 gap-4 w-full"
    >
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex-shrink-0">
        Editor
      </span>

      <div className="flex items-center gap-1 flex-shrink-0">
        {!isCompact ? (
          <>
            <select 
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="text-xs bg-transparent border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <option value={12}>12px</option>
              <option value={14}>14px</option>
              <option value={16}>16px</option>
              <option value={18}>18px</option>
            </select>
            
            <Button variant="ghost" size="sm" onClick={handleCopy} title="Copy">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSave} title="Save">
              <Save className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownload} title="Download">
              <Download className="h-4 w-4" />
            </Button>
            {handlePrint && (
              <Button variant="ghost" size="sm" onClick={handlePrint} title="Print">
                <Printer className="h-4 w-4" />
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleCompile} title="Compile">
              <SquareTerminal  className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={handleCompile} title="Compile">
              <SquareTerminal  className="h-4 w-4" />
            </Button>
            
            <div className="relative">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                title="More options"
              >
                {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>

              {isMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  
                  <div className="absolute right-0 top-full mt-2 z-50 min-w-[200px] bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                    <div className="p-3 border-b border-zinc-200 dark:border-zinc-700">
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">
                        Font Size
                      </label>
                      <select 
                        value={fontSize}
                        onChange={(e) => {
                          setFontSize(Number(e.target.value));
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-sm bg-transparent border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5"
                      >
                        <option value={12}>12px</option>
                        <option value={14}>14px</option>
                        <option value={16}>16px</option>
                        <option value={18}>18px</option>
                      </select>
                    </div>

                    <div className="p-2">
                      {menuItems.map((item, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            item.action();
                            setIsMenuOpen(false);
                          }}
                          className="w-full justify-start gap-2 mb-1 last:mb-0"
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}