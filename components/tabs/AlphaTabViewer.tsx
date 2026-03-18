"use client";

import "@/app/globals.css";
import { AlphaTabApi } from "@coderline/alphatab";
import * as alphaTab from "@coderline/alphatab";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import TrackSelectorModal from "./Editor/TrackSelectorModal";
import PlayerControl from "./Player/PlayerControls";
import EditBox from "./Editor/EditBox";

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

const DEFAULT_TAB_URL = "https://www.alphatab.net/files/canon.gp";
// const DEFAULT_TAB_URL = "/asda.gp3";
const SOUNDFONT_URL =
  "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2";

interface AlphaTabViewerProps {
  fileUrl?: string | null;
  fileName?: string;
  onScoreLoaded?: (score: alphaTab.model.Track) => void;
  onApiReady?: (api: AlphaTabApi) => void;
  showOnlyFirstTrack?: boolean;
}

export default function AlphaTabViewer({
  fileUrl,
  fileName,
  showOnlyFirstTrack = true,
  onScoreLoaded,
  onApiReady,
}: AlphaTabViewerProps) {
  const { resolvedTheme } = useTheme();

  const viewportRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<AlphaTabApi>(null);

  const [refsReady, setRefsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [position, setPosition] = useState({
    current: "00:00",
    total: "00:00",
  });
  const [editorModalActive, setEditorModalActive] = useState(false);
  const [editorActive, setEditorActive] = useState(false);
  const [tracks, setTracks] = useState<alphaTab.model.Track[] | null>(null);
  const [editTrack, setEditTrack] = useState<alphaTab.model.Track | null>(null);
  const [alphaTexContent, setAlphaTexContent] = useState(`\\title "My Tab"
    \\subtitle "In AlphaTeX"
    \\tempo 120

    . \\notes :4 C D E F | G A B c |
    . \\notes :8 C D E F G A B c |
  `);

  const setMainRef = useCallback((node: HTMLDivElement | null) => {
    mainRef.current = node;
    if (node && viewportRef.current) setRefsReady(true);
  }, []);

  const setViewportRef = useCallback((node: HTMLDivElement | null) => {
    viewportRef.current = node;
    if (node && mainRef.current) setRefsReady(true);
  }, [])

  useEffect(() => {
    if (!refsReady) return;
    if (!apiRef.current || !isPlayerReady) return;

    const colors = resolvedTheme === "dark" ? darkTheme : lightTheme;
    const resources = apiRef.current.settings.display.resources;

    resources.staffLineColor = alphaTab.model.Color.fromJson(
      colors.staffLineColor,
    )!;
    resources.barSeparatorColor = alphaTab.model.Color.fromJson(
      colors.barSeparatorColor,
    )!;
    resources.mainGlyphColor = alphaTab.model.Color.fromJson(
      colors.mainGlyphColor,
    )!;
    resources.secondaryGlyphColor = alphaTab.model.Color.fromJson(
      colors.secondaryGlyphColor,
    )!;
    resources.scoreInfoColor = alphaTab.model.Color.fromJson(
      colors.scoreInfoColor,
    )!;
    resources.barNumberColor = alphaTab.model.Color.fromJson(
      colors.barNumberColor,
    )!;

    apiRef.current.updateSettings();
    apiRef.current.render();
  }, [resolvedTheme, isPlayerReady, refsReady]);

  useEffect(() => {
    // AlphaTab must only run in the browser (no SSR)
    if (typeof window === "undefined") return;
    if (!mainRef.current || !viewportRef.current) return;

    let destroyed = false;

    if (apiRef.current) {
      apiRef.current.destroy();
      apiRef.current = null;
    }

    while (mainRef.current.firstChild) {
      mainRef.current.removeChild(mainRef.current.firstChild);
    }

    setIsPlayerReady(false);
    setIsPlaying(false);

    // Dynamically import alphatab to ensure browser-only execution
    import("@coderline/alphatab").then((alphaTab) => {
      if (destroyed) return;
      if (!mainRef.current || !viewportRef.current) return;

      const colors = resolvedTheme === "dark" ? darkTheme : lightTheme;

      const initialFile = editorActive ? null : (fileUrl ?? DEFAULT_TAB_URL);

      const settings = {
        file: initialFile,
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
        setTracks(score.tracks);
        if (onScoreLoaded) onScoreLoaded(score);
      });

      api.renderStarted.on(() => setIsLoading(true));
      api.renderFinished.on(() => setIsLoading(false));

      api.playerReady.on(() => {
        setIsPlayerReady(true);
        if (apiRef.current) apiRef.current.countInVolume = 0;
      });

      api.playerStateChanged.on((e: any) => setIsPlaying(e.state === 1));

      api.soundFontLoad.on((e: any) =>
        setLoadProgress(Math.floor((e.loaded / e.total) * 100)),
      );

      api.playerPositionChanged.on((e: any) =>
        setPosition({
          current: formatTime(e.currentTime),
          total: formatTime(e.endTime),
        }),
      );

      if (onApiReady) onApiReady(api);
    });

    return () => {
      destroyed = true;
      apiRef.current?.destroy();
      apiRef.current = null;
    };
  }, [resolvedTheme, editorActive, fileUrl, onApiReady, onScoreLoaded]);

  useEffect(() => {
    if (!fileUrl || editorActive) return;
    if (!apiRef.current) return;

    apiRef.current.load(fileUrl);
  }, [fileUrl, editorActive]);

  function formatTime(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function showEditorModal() {
    setEditorActive((v) => !v);
  }

  function handleAlphaTexChange(newContent: string) {
    setAlphaTexContent(newContent);
  }

  function handleEditTrackSelect() {
    setEditorModalActive(false);
    setEditorActive(true);
  }

  return (
    <div className="w-[90vw] h-[85vh] flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc dark:bg-zinc-950 shadow-lg relative">
      {editorModalActive && (
        <TrackSelectorModal
          editorModalActive={editorModalActive}
          onClose={handleEditTrackSelect}
          onTrackSelect={setEditTrack}
          tracks={tracks}
          apiRef={apiRef.current}
          onTexUpdate={setAlphaTexContent}
        />
      )}

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

      <div className="flex w-full h-full">
        {editorActive && (
          <div className="w-1/2 h-full border-r border-zinc-200 dark:border-zinc-800">
            <EditBox
              value={alphaTexContent}
              onChange={handleAlphaTexChange}
              apiRef={apiRef.current}
            />
          </div>
        )}

        <div
          className={`flex flex-col h-full ${editorActive ? "w-1/2" : "w-full"}`}
        >
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            <PlayerControl
              apiRef={apiRef.current}
              isPlayerReady={isPlayerReady}
              isPlaying={isPlaying}
              position={position}
              onShowEditorModal={showEditorModal}
              tracks={tracks}
            />
          </div>

          <div className="flex-1 overflow-hidden relative">
            <div
              ref={setViewportRef}
              className="absolute inset-0 overflow-y-auto px-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full z-0 h-auto"
            >
              <div ref={setMainRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
