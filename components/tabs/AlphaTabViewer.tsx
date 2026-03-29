"use client";

import "@/app/globals.css";
import { useAlphaTab } from "@/hooks/useAlphaTab";
import { useModelViewer } from "@/hooks/useModelViewer";
import { useSyncedPlayback } from "@/hooks/useSyncedPlayback";
import * as alphaTab from "@coderline/alphatab";
import TrackSelectorModal from "./Editor/TrackSelectorModal";
import AnimatorSelectorModal from "../model-viewer/animatorSelectorModel";
import PlayerControl from "./Player/PlayerControls";
import EditBox from "./Editor/EditBox";
import { useCallback, useState } from "react";
import ModelCanvas from "../ModelCanvas";
import exporter from "@/hooks/src/debugExporter copy";

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
  const [alphaTexContent, setAlphaTexContent] = useState(`
\\tuning (E4 B3 G3 D3 A2 E2)
\\ts (4 4)
\\tempo 90
  12.2{v}.2{beam Down}
  14.2{v}.4{beam Down}
  15.2.8{beam Down}
  17.2.8{beam Down}
|
  14.1{v}.2{beam Down}
  17.2.8{beam Down}
  15.1.8{beam Down}
  14.1{h}.16{tu (3 2) beam Down}
  15.1{h}.16{tu (3 2) beam Down}
  14.1.16{tu (3 2) beam Down}
  17.2.8{beam Down}
|
  15.2{v}.4{d beam Down}
  17.2{h}.16{beam Down}
  15.2.16{beam Down}
  14.2.8{beam Down}
  14.1.8{beam Down}
  17.1.8{beam Down}
  19.1.8{beam Down}

  `);

  // Animation/Video state
  const [animatorModalActive, setAnimatorModalActive] = useState(false);
  const [animatorData, setAnimatorData] = useState<{
    track: alphaTab.model.Track;
    alphaTex: string;
    parsedTex: string;
    trackName: string;
  } | null>(null);
  const [showAnimator, setShowAnimator] = useState(false);

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

  const handleShowAnimatorModal = useCallback(() => {
    setAnimatorModalActive(true);
  }, []);

  const handleAnimatorModalClose = useCallback(() => {
    setAnimatorModalActive(false);
  }, []);

  const handleAnimatorDataUpdate = useCallback(
    (data: {
      track: alphaTab.model.Track;
      alphaTex: string;
      parsedTex: string;
      trackName: string;
    }) => {
      console.log("Animator data received:", {
        trackName: data.trackName,
        alphaTexLength: data.alphaTex.length,
        parsedTexLength: data.parsedTex.length,
      });

      setAnimatorData(data);
      setShowAnimator(true); // Show the animation panel
      setAnimatorModalActive(false); // Close the modal

      // You can also trigger video generation here
      // For example, start processing the parsedTex for animation
      // generateVideoFromAlphaTex(data.parsedTex);
    },
    [],
  );

  const handleCloseAnimator = useCallback(() => {
    setShowAnimator(false);
    setAnimatorData(null);
  }, []);

  const handleExport = useCallback(() => {
    if (!alphaTexContent) {
      console.warn("No content to export");
      return;
    }

    try {
      console.log("Exporting content:", alphaTexContent);

      const exportedData = exporter(alphaTexContent);
      console.log("Exported JSON:", exportedData);

      // Optional: Download as JSON file
      const dataStr = JSON.stringify(exportedData, null, 2);
      const dataUri =
        "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      const exportFileDefaultName = `tab-export-${Date.now()}.json`;

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Check console for errors.");
    }
  }, [alphaTexContent]);

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
        {/* Animator Modal */}
        {animatorModalActive && (
          <AnimatorSelectorModal
            animatorModalActive={animatorModalActive}
            onClose={handleAnimatorModalClose}
            tracks={tracks}
            onTrackSelect={(track) => {
              console.log("Selected track for animation:", track.name);
            }}
            apiRef={apiRef.current}
            onAnimatorDataUpdate={handleAnimatorDataUpdate}
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
          {/* NEW: Animator Panel - shows when track is selected for animation */}
          {showAnimator && animatorData && (
            <div className="w-full sm:w-1/2 h-full border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    Animation Track: {animatorData.trackName}
                  </h3>
                  <button
                    onClick={handleCloseAnimator}
                    className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Close
                  </button>
                </div>

                {/* Display parsed AlphaTex content */}
                <div className="bg-zinc-900 p-4 rounded-lg">
                  <pre className="text-xs text-green-400 overflow-x-auto">
                    {animatorData.parsedTex}
                  </pre>
                </div>

                {/* Add your video generation UI here */}
                <div className="mt-4">
                  <button
                    className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                    onClick={() => {
                      console.log(
                        "Generate video from:",
                        animatorData.parsedTex,
                      );
                      // Call your video generation function here
                    }}
                  >
                    Generate Video
                  </button>
                </div>
              </div>
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
                  onExport={handleExport}
                  alphaTexContent={alphaTexContent}
                  onShowAnimatorModal={handleShowAnimatorModal}
                  animatorShow={true}
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
