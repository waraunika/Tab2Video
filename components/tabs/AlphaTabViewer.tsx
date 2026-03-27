"use client";

import "@/app/globals.css";
import { useAlphaTab } from "@/hooks/useAlphaTab";
import { useModelViewer } from "@/hooks/useModelViewer";
import { useSyncedPlayback } from "@/hooks/useSyncedPlayback";
import * as alphaTab from "@coderline/alphatab";
import TrackSelectorModal from "./Editor/TrackSelectorModal";
import PlayerControl from "./Player/PlayerControls";
import EditBox from "./Editor/EditBox";
import { useCallback, useState } from "react";
import ModelCanvas from "../ModelCanvas";

interface AlphaTabViewerProps {
  fileUrl?: string | null;
  onScoreLoaded?: (score: alphaTab.model.Score) => void;
  onApiReady?: (api: alphaTab.AlphaTabApi) => void;
  editorModeAvailable?: boolean;
  modelPath?: string; // path to .glb model
  syncModel?: boolean; // sync 3d animatin to alphatab
  scaleModelToFit?: boolean; // if glb and score have different duration, scale time proportionally
}

export default function AlphaTabViewer({
  fileUrl,
  onScoreLoaded,
  onApiReady,
  editorModeAvailable = true,
  modelPath = "/models/Tab2Vid.glb",
  syncModel = true,
  scaleModelToFit = false,
}: AlphaTabViewerProps) {
  const [editorModalActive, setEditorModalActive] = useState(false);
  const [editorActive, setEditorActive] = useState(false);
  const [editTrack, setEditTrack] = useState<alphaTab.model.Track | null>(null);
  const [alphaTexContent, setAlphaTexContent] = useState(`\\title "My Tab"
    \\subtitle "In AlphaTeX"
    \\tempo 120

    . \\notes :4 C D E F | G A B c |
    . \\notes :8 C D E F G A B c |
  `);

  const {
    apiRef,
    mainRef,
    viewportRef,
    isLoading,
    isPlaying,
    isPlayerReady,
    loadProgress,
    position,
    tracks,
  } = useAlphaTab({
    fileUrl,
    editorActive,
    onApiReady,
    onScoreLoaded,
  });

  const {
    canvasRef,
    playing: modelPlaying,
    currentTime: modelCurrentTime,
    duration: modelDuration,
    playPause: modelPlayPause,
    restart: modelRestart,
    seekTo: modelSeekTo,
    setExternalPlaying,
  } = useModelViewer({
    modelPath,
    onAnimationEnd: () => {
      apiRef.current?.stop();
    },
  });

  const handleTrackSelect = useCallback((track: alphaTab.model.Track) => {
    setEditTrack(track);
    setEditorActive(true);
  }, []);

  const handleTrackSelectorModalClose = useCallback(() => {
    setEditorModalActive(false);
  }, []);

  const showEditorModal = useCallback(() => {
    setEditorModalActive((v) => !v);
  }, []);

  function handleAlphaTexChange(newContent: string) {
    setAlphaTexContent(newContent);
  }

  // sync alphatab to GLB
  useSyncedPlayback({
    apiRef,
    glbDuration: modelDuration,
    alphatabDuration: position.totalMs,
    setExternalPlaying,
    seekTo: modelSeekTo,
    scaleToFit: scaleModelToFit,
  });

  return (
    <div>
      <div className="w-full h-[50vh] flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc dark:bg-zinc-950 shadow-lg relative">
        {editorModalActive && (
          <TrackSelectorModal
            editorModalActive={editorModalActive}
            onClose={handleTrackSelectorModalClose}
            onTrackSelect={handleTrackSelect}
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
                  position={{
                    current: position.currentStr,
                    total: position.totalStr,
                  }}
                  editorActive={editorActive}
                  onShowEditorModal={showEditorModal}
                  tracks={tracks}
                  editorShow={editorModeAvailable}
                />
              </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
              <div
                ref={viewportRef}
                className="absolute inset-0 overflow-x-auto overflow-y-auto px-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full z-0"
              >
                <div ref={mainRef} className="min-w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {syncModel && (
        <div className="w-full mt-4">
          <ModelCanvas
            canvasRef={canvasRef}
            playing={modelPlaying}
            currentTime={modelCurrentTime}
            duration={modelDuration}
          />
        </div>
      )}
    </div>
  );
}

