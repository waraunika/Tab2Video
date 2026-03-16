"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerControl } from "./Player/PlayerControls";
import EditBox from "./Editor/EditBox";
import "@/app/globals.css";
import { AlphaTabApi } from "@coderline/alphatab";
import * as alphaTab from "@coderline/alphatab";
import { useTheme } from "next-themes";

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

const TAB_FILE_URL =
  "https://www.alphatab.net/files/canon.gp";
const SOUNDFONT_URL =
  "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2";

export default function AlphaTabViewer() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<AlphaTabApi>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [position, setPosition] = useState({
    current: "00:00",
    total: "00:00",
  });
  const [editorActive, setEditorActive] = useState(false);
  const { resolvedTheme } = useTheme();
  const [tracks, setTracks] = useState<alphaTab.model.Track[] | null>(null);

  useEffect(() => {
    const getThemeColors = () => {
      return resolvedTheme === "dark" ? darkTheme : lightTheme;
    };

    const updateTheme = () => {
      if (!apiRef.current) return;

      const colors = getThemeColors();
      apiRef.current.settings.display.resources.staffLineColor =
        alphaTab.model.Color.fromJson(colors.staffLineColor)!;
      apiRef.current.settings.display.resources.barSeparatorColor =
        alphaTab.model.Color.fromJson(colors.barSeparatorColor)!;
      apiRef.current.settings.display.resources.mainGlyphColor =
        alphaTab.model.Color.fromJson(colors.mainGlyphColor)!;
      apiRef.current.settings.display.resources.secondaryGlyphColor =
        alphaTab.model.Color.fromJson(colors.secondaryGlyphColor)!;
      apiRef.current.settings.display.resources.scoreInfoColor =
        alphaTab.model.Color.fromJson(colors.scoreInfoColor)!;
      apiRef.current.settings.display.resources.barNumberColor =
        alphaTab.model.Color.fromJson(colors.barNumberColor)!;

      apiRef.current.updateSettings();
      apiRef.current.render();
    };

    if (apiRef.current && isPlayerReady) {
      updateTheme();
    }
  }, [resolvedTheme, isPlayerReady]);

  useEffect(() => {
    // AlphaTab must only run in the browser (no SSR)
    if (typeof window === "undefined") return;
    if (!mainRef.current || !viewportRef.current) return;

    // Dynamically import alphatab to ensure browser-only execution
    import("@coderline/alphatab").then((alphaTab) => {
      const colors = resolvedTheme === "dark" ? darkTheme : lightTheme;

      const settings = {
        file: TAB_FILE_URL,
        player: {
          enablePlayer: true,
          soundFont: SOUNDFONT_URL,
          scrollElement: viewportRef.current!,
          enableCursor: true,
          enableUserInteraction: true,
        },
        display: {
          scale: 1.0,
          layoutMode: alphaTab.LayoutMode.Horizontal,
          resources: {
            staffLineColor: alphaTab.model.Color.fromJson(
              colors.staffLineColor,
            ),
            barSeparatorColor: alphaTab.model.Color.fromJson(
              colors.barSeparatorColor,
            ),
            mainGlyphColor: alphaTab.model.Color.fromJson(
              colors.mainGlyphColor,
            ),
            secondaryGlyphColor: alphaTab.model.Color.fromJson(
              colors.secondaryGlyphColor,
            ),
            scoreInfoColor: alphaTab.model.Color.fromJson(
              colors.scoreInfoColor,
            ),
            barNumberColor: alphaTab.model.Color.fromJson(
              colors.barNumberColor,
            ),
          },
        },
        // Point workers to the CDN so Next.js doesn't need to bundle them
        core: {
          scriptFile:
            "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.js",
          fontDirectory:
            "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/",
        },
      };

      const api = new alphaTab.AlphaTabApi(mainRef.current!, settings);
      apiRef.current = api;

      api.scoreLoaded.on((score) => {
        setTracks(score.tracks)
      })

      api.renderStarted.on(() => {
        setIsLoading(true);
      });

      api.renderFinished.on(() => {
        setIsLoading(false);
      });

      api.playerReady.on(() => {
        setIsPlayerReady(true);
        // Set initial count-in to 0 (off)
        if (apiRef.current) {
          apiRef.current.countInVolume = 0;
        }
      });

      api.playerStateChanged.on((e: any) => {
        setIsPlaying(e.state === 1); // 1 = Playing
      });

      api.soundFontLoad.on((e: any) => {
        setLoadProgress(Math.floor((e.loaded / e.total) * 100));
      });

      api.playerPositionChanged.on((e: any) => {
        setPosition({
          current: formatTime(e.currentTime),
          total: formatTime(e.endTime),
        });
      });
    });

    return () => {
      apiRef.current?.destroy();
    };
  }, [resolvedTheme]);

  function formatTime(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function showEditor() {
    const newValue = !editorActive;
    setEditorActive(newValue);
  }

  return (
    <div
      ref={wrapperRef}
      className="w-[90vw] h-[85vh] flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc dark:bg-zinc-950 shadow-lg relative"
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 backdrop-blur-sm bg-zinc/75 dark:bg-zinc-950/75 flex justify-center items-start">
          <div className="mt-6 bg-zinc dark:bg-zinc-800 px-6 py-4 rounded-lg shadow-lg text-sm text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
            {loadProgress > 0 && loadProgress < 100
              ? `Loading soundfont… ${loadProgress}%`
              : "Rendering sheet music…"}
          </div>
        </div>
      )}

      {editorActive && <EditBox />}

      {/* Controls bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <PlayerControl
          apiRef={apiRef.current}
          isPlayerReady={isPlayerReady}
          isPlaying={isPlaying}
          position={position}
          onShowEditor={showEditor}
          tracks={tracks}
        />
      </div>

      {/* Sheet music viewport */}
      <div className="flex-1 overflow-hidden relative">
        <div
          ref={viewportRef}
          className="absolute inset-0 overflow-y-auto px-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full z-0 h-auto"
        >
          <div ref={mainRef} />
        </div>
      </div>
    </div>
  );
}
