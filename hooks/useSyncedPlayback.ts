// useSyncedPlayback.ts
"use client";

import { AlphaTabApi } from "@coderline/alphatab";
import { useEffect, useRef } from "react";

export interface UseSyncedPlaybackOptions {
  apiRef: React.RefObject<AlphaTabApi | null>;
  glbDuration: number; // in seconds
  alphatabDuration: number; // in ms
  seekTo: (seconds: number) => void;
  setExternalPlaying: (playing: boolean) => void;
  scaleToFit?: boolean;
}

export function useSyncedPlayback({
  apiRef,
  glbDuration,
  alphatabDuration,
  seekTo,
  setExternalPlaying,
  scaleToFit = false,
}: UseSyncedPlaybackOptions) {
  const isScrubbingRef = useRef(false);
  const lastSyncedTimeRef = useRef(0);

  useEffect(() => {
    const api = apiRef.current;
    if (!api || !glbDuration || !alphatabDuration) return;

    // Handle playback state changes
    const handleStateChange = (e: any) => {
      const isPlaying = e.state === 1; // 1 = playing
      setExternalPlaying(isPlaying);
    };

    // Handle position changes (seek from AlphaTab)
    const handlePositionChange = (e: any) => {
      if (isScrubbingRef.current) return;
      
      const alphaTabTimeMs = e.currentTime;
      let targetSeconds: number;
      
      if (scaleToFit && alphatabDuration > 0) {
        // Scale proportionally: if AlphaTab is longer/shorter than GLB animation
        const ratio = alphaTabTimeMs / alphatabDuration;
        targetSeconds = Math.min(ratio * glbDuration, glbDuration);
      } else {
        // Direct mapping (assuming same duration)
        targetSeconds = Math.min(alphaTabTimeMs / 1000, glbDuration);
      }
      
      // Avoid excessive updates
      if (Math.abs(targetSeconds - lastSyncedTimeRef.current) > 0.01) {
        lastSyncedTimeRef.current = targetSeconds;
        seekTo(targetSeconds);
      }
    };

    // Handle when AlphaTab finishes playback
    const handleFinished = () => {
      setExternalPlaying(false);
      // Optionally seek to end of animation
      seekTo(glbDuration);
    };

    api.playerStateChanged.on(handleStateChange);
    api.playerPositionChanged.on(handlePositionChange);
    api.playerFinished.on(handleFinished);

    return () => {
      api.playerStateChanged.off(handleStateChange);
      api.playerPositionChanged.off(handlePositionChange);
      api.playerFinished.off(handleFinished);
    };
  }, [apiRef, glbDuration, alphatabDuration, seekTo, setExternalPlaying, scaleToFit]);

  return { isScrubbingRef };
}