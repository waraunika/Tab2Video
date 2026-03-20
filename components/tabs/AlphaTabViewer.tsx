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
  staffLineColor: new alphaTab.model.Color(228, 228, 231),
  barSeparatorColor: new alphaTab.model.Color(161, 161, 170),
  mainGlyphColor: new alphaTab.model.Color(39, 39, 42),
  secondaryGlyphColor: new alphaTab.model.Color(68, 64, 60),
  scoreInfoColor: new alphaTab.model.Color(24, 24, 27),
  barNumberColor: new alphaTab.model.Color(130, 130, 145),
};

const darkTheme = {
  staffLineColor: new alphaTab.model.Color(68, 64, 60),
  barSeparatorColor: new alphaTab.model.Color(130, 130, 145),
  mainGlyphColor: new alphaTab.model.Color(244, 244, 245),
  secondaryGlyphColor: new alphaTab.model.Color(228, 228, 231),
  scoreInfoColor: new alphaTab.model.Color(255, 255, 255),
  barNumberColor: new alphaTab.model.Color(212, 212, 216),
};

const DEFAULT_TAB_URL = "https://www.alphatab.net/files/canon.gp";
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
  }, []);

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

    import("@coderline/alphatab").then((alphaTab) => {
      if (destroyed) return;
      if (!mainRef.current || !viewportRef.current) return;

      const colors = resolvedTheme === "dark" ? darkTheme : lightTheme;

      const initialFile = editorActive ? null : (fileUrl ?? DEFAULT_TAB_URL);
      const settings = new alphaTab.Settings();
      settings.core.file = initialFile;
      settings.core.scriptFile = "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.js";
      settings.core.fontDirectory = "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/";
      settings.player.playerMode = alphaTab.PlayerMode.EnabledAutomatic;
      settings.player.soundFont = SOUNDFONT_URL;
      settings.player.scrollElement = viewportRef.current!;
      settings.player.enableCursor = true;
      settings.player.enableUserInteraction = true;
      settings.display.scale = 1.0;
      settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
      settings.display.resources.staffLineColor = colors.staffLineColor;
      settings.display.resources.barSeparatorColor = colors.barSeparatorColor;
      settings.display.resources.mainGlyphColor = colors.mainGlyphColor;
      settings.display.resources.secondaryGlyphColor = colors.secondaryGlyphColor;
      settings.display.resources.scoreInfoColor = colors.scoreInfoColor;
      settings.display.resources.barNumberColor = colors.barNumberColor;

      const api = new alphaTab.AlphaTabApi(mainRef.current!, settings);
      apiRef.current = api;

      api.scoreLoaded.on((score) => {
        setTracks(score.tracks);
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
    setEditorModalActive((v) => !v);
  }

  function handleAlphaTexChange(newContent: string) {
    setAlphaTexContent(newContent);
  }

  function handleEditTrackSelect() {
    setEditorModalActive(false);
    setEditorActive(true);
  }

  return (
    <div className="w-full h-[85vh] flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc dark:bg-zinc-950 shadow-lg relative">
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

      <div className="flex w-full h-full overflow-hidden">
        {editorActive && (
          <div className="w-full sm:w-1/2 h-full border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
            <EditBox
              value={alphaTexContent}
              onChange={handleAlphaTexChange}
              apiRef={apiRef.current}
            />
          </div>
        )}

        <div
          className={`flex flex-col h-full ${editorActive ? "w-full sm:w-1/2" : "w-full"} overflow-hidden`}
        >
          <div className="flex-shrink-0 overflow-x-auto overflow-y-hidden">
            <div className="min-w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
              <PlayerControl
                apiRef={apiRef.current}
                isPlayerReady={isPlayerReady}
                isPlaying={isPlaying}
                position={position}
                editorActive={editorActive}
                onShowEditorModal={showEditorModal}
                tracks={tracks}
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <div
              ref={setViewportRef}
              className="absolute inset-0 overflow-x-auto overflow-y-auto px-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full z-0"
            >
              <div ref={setMainRef} className="min-w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}