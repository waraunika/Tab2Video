"use client";

import * as alphaTab from "@coderline/alphatab";
import { useTheme } from "next-themes";
import React, { useCallback, useEffect, useRef, useState } from "react";

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
const SOUNDFONT_URL = "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2";

export interface AlphaTabPosition {
  currentMs: number; // raw ms - for syncing with glb
  totalMs: number;
  currentStr: string; // format of "MM:SS" for display
  totalStr: string;
}

export interface UseAlphaTabOptions {
  fileUrl?: string | null;
  editorActive?: boolean;
  onApiReady?: (api: alphaTab.AlphaTabApi) => void;
  onScoreLoaded?: (score: alphaTab.model.Score) => void;
  onPositionChanged?: (currentMs: number, totalMs: number) => void;
  onPlaybackFinished?: () => void;
}

export interface UseAlphaTabReturn {
  apiRef: React.RefObject<alphaTab.AlphaTabApi | null>;
  mainRef: React.RefCallback<HTMLDivElement>;
  viewportRef: React.RefCallback<HTMLDivElement>;
  isLoading: boolean;
  isPlaying: boolean;
  isPlayerReady: boolean;
  loadProgress: number;
  position: AlphaTabPosition;
  tracks: alphaTab.model.Track[] | null;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function useAlphaTab({
  fileUrl,
  editorActive = false,
  onApiReady,
  onScoreLoaded,
  onPositionChanged,
  onPlaybackFinished
}: UseAlphaTabOptions): UseAlphaTabReturn {
  const { resolvedTheme } = useTheme();

  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null);
  const mainDivRef = useRef<HTMLDivElement | null>(null);
  const viewportDivRef = useRef<HTMLDivElement | null>(null);
  const [refsReady, setRefsReady] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [tracks, setTracks] = useState<alphaTab.model.Track[] | null>(null);
  const [position, setPosition] = useState<AlphaTabPosition>({
    currentMs: 0,
    totalMs: 0,
    currentStr: "00:00",
    totalStr: "00:00",
  });

  const mainRef = useCallback((node: HTMLDivElement | null) => {
    mainDivRef.current = node;
    if (node && viewportDivRef.current) {
      setRefsReady(true);
    }
  }, []);

  const viewportRef = useCallback((node: HTMLDivElement | null) => {
    viewportDivRef.current = node;
    if (node && mainDivRef.current) {
      setRefsReady(true);
    }
  }, []);

  // theme sync
  useEffect(() => {
    if (!refsReady || !apiRef.current || !isPlayerReady) {
      return;
    }

    const colors = resolvedTheme === "dark" ? darkTheme : lightTheme;
    const resources = apiRef.current.settings.display.resources;

    resources.staffLineColor = alphaTab.model.Color.fromJson(colors.staffLineColor)!;
    resources.barSeparatorColor = alphaTab.model.Color.fromJson(colors.barSeparatorColor)!;
    resources.mainGlyphColor = alphaTab.model.Color.fromJson(colors.mainGlyphColor)!;
    resources.secondaryGlyphColor = alphaTab.model.Color.fromJson(colors.secondaryGlyphColor)!;
    resources.scoreInfoColor = alphaTab.model.Color.fromJson(colors.scoreInfoColor)!;
    resources.barNumberColor = alphaTab.model.Color.fromJson(colors.barNumberColor)!;

    apiRef.current.updateSettings();
    apiRef.current.render();
  }, [resolvedTheme, isPlayerReady, refsReady]);

  // api init
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!mainDivRef.current || !viewportDivRef.current) {
      return;
    }

    let destroyed = false;

    // tear down previous instance of alphatab's api, if it exists
    if (apiRef.current) {
      apiRef.current.destroy();
      apiRef.current = null;
    }
    while (mainDivRef.current.firstChild) {
      mainDivRef.current.removeChild(mainDivRef.current.firstChild);
    }

    setIsPlayerReady(false);
    setIsPlaying(false);

    import("@coderline/alphatab").then((alphatab) => {
      if (destroyed) {
        return;
      }

      if (!mainDivRef.current || !viewportDivRef.current) {
        return;
      }

      const colors = resolvedTheme === "dark" ? darkTheme : lightTheme;
      const initialFile = editorActive ? null : (fileUrl ?? DEFAULT_TAB_URL);

      const settings = new alphatab.Settings();
      settings.core.file = initialFile;
      settings.core.scriptFile = "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.js";
      settings.core.fontDirectory = "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/";
      settings.player.playerMode = alphatab.PlayerMode.EnabledAutomatic;
      settings.player.soundFont = SOUNDFONT_URL;
      settings.player.scrollElement = viewportDivRef.current;
      settings.player.enableCursor = true;
      settings.display.scale = 1.0;
      settings.display.layoutMode = alphatab.LayoutMode.Horizontal;
      settings.display.resources.staffLineColor = colors.staffLineColor;
      settings.display.resources.barSeparatorColor = colors.barSeparatorColor;
      settings.display.resources.mainGlyphColor = colors.mainGlyphColor;
      settings.display.resources.secondaryGlyphColor = colors.secondaryGlyphColor;
      settings.display.resources.scoreInfoColor = colors.scoreInfoColor;
      settings.display.resources.barNumberColor = colors.barNumberColor;

      const api = new alphatab.AlphaTabApi(mainDivRef.current!, settings);
      apiRef.current = api;

      api.scoreLoaded.on((score) => {
        setTracks(score.tracks);
        onScoreLoaded?.(score);
      });
 
      api.renderStarted.on(() => setIsLoading(true));
      api.renderFinished.on(() => setIsLoading(false));
 
      api.playerReady.on(() => {
        setIsPlayerReady(true);
        if (apiRef.current) apiRef.current.countInVolume = 0;
      });
 
      api.playerStateChanged.on((e: any) => {
        const playing = e.state === 1;
        setIsPlaying(playing);
        // state 0 = stopped/finished — notify parent
        if (!playing) onPlaybackFinished?.();
      });
 
      api.soundFontLoad.on((e: any) =>
        setLoadProgress(Math.floor((e.loaded / e.total) * 100)),
      );
 
      api.playerPositionChanged.on((e: any) => {
        setPosition({
          currentMs: e.currentTime,
          totalMs: e.endTime,
          currentStr: formatTime(e.currentTime),
          totalStr: formatTime(e.endTime),
        });
        onPositionChanged?.(e.currentTime, e.endTime);
      });
 
      onApiReady?.(api);
    });

    return () => {
      destroyed = true;
      apiRef.current?.destroy();
      apiRef.current = null;
    }
  }, [resolvedTheme, editorActive, fileUrl, onApiReady, onPlaybackFinished, onPositionChanged, onScoreLoaded]);

  useEffect(() => {
    if (!fileUrl || editorActive || !apiRef.current) return;
    apiRef.current.load(fileUrl);
  }, [fileUrl, editorActive]);

  return {
    apiRef,
    mainRef,
    viewportRef,
    isLoading,
    isPlaying,
    isPlayerReady,
    loadProgress,
    position,
    tracks,
  }
}
