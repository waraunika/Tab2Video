"use client";

import {
  Hourglass,
  Metronome,
  Pause,
  Pencil,
  Play,
  Printer,
  Repeat,
  StepBack,
  Video,
} from "lucide-react";
import { useState } from "react";
import ZoomControl from "../UI/ZoomControl";
import LayoutControl from "../UI/LayoutControl";
import { AlphaTabApi } from "@coderline/alphatab";
import * as alphaTab from "@coderline/alphatab";
import { Button } from "@/components/ui/button";
import TrackSelector from "./TrackSelector";
import exporter from "@/hooks/src/debugExporter copy";

interface Position {
  current: string;
  total: string;
}

interface PlayerControlProps {
  apiRef: AlphaTabApi | null;
  isPlayerReady: boolean;
  isPlaying: boolean;
  position: Position;
  tracks: alphaTab.model.Track[] | null;
  editorActive: boolean;
  onShowEditorModal: () => void;
  editorShow: boolean;
  onExport?: () => void;
  alphaTexContent?: string;
}

export default function PlayerControl({
  apiRef,
  isPlayerReady,
  isPlaying,
  position,
  tracks,
  editorActive,
  onShowEditorModal,
  editorShow,
  onExport,
  alphaTexContent,
}: PlayerControlProps) {
  const [countInActive, setCountInActive] = useState(false);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [loopActive, setLoopActive] = useState(false);

  function togglePlay(): void {
    if (apiRef) {
      apiRef.playPause();
    }
  }

  function stop(): void {
    if (apiRef) {
      apiRef.stop();
    }
  }

  function toggleCountIn(): void {
    const newValue = !countInActive;
    setCountInActive(newValue);
    if (apiRef) {
      apiRef.countInVolume = newValue ? 1 : 0;
    }
  }

  function toggleMetronome(): void {
    const newValue = !metronomeActive;
    setMetronomeActive(newValue);
    if (apiRef) {
      apiRef.metronomeVolume = newValue ? 1 : 0;
    }
  }

  function toggleLoop(): void {
    const newValue = !loopActive;
    setLoopActive(newValue);
    if (apiRef) {
      apiRef.isLooping = newValue;
    }
  }
  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      console.warn("Export handler not provided");
      alert("Export functionality is not available");
    }
  };

  return (
    <div className="flex items-center justify-between w-full gap-2 overflow-x-auto overflow-y-hidden">
      {/* Far left: Playback controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          onClick={stop}
          disabled={!isPlayerReady}
          title="Stop / Reset"
          variant={"secondary"}
          size="sm"
          className="h-8 w-8 p-0"
        >
          <StepBack size={16} />
        </Button>

        <div className="flex-shrink-0">
          <TrackSelector tracks={tracks} apiRef={apiRef} />
        </div>

        <Button
          onClick={togglePlay}
          disabled={!isPlayerReady}
          title={isPlaying ? "Pause" : "Play"}
          variant={isPlaying ? "secondary" : "outline"}
          size="sm"
          className="h-8 w-8 p-0 flex-shrink-0"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </Button>
      </div>

      {/* Time display */}
      <div className="flex items-center flex-shrink-0">
        <span className="text-sm font-mono px-3 py-1.5 rounded-md border whitespace-nowrap">
          {position.current} / {position.total}
        </span>
      </div>

      {/* Settings controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          onClick={toggleCountIn}
          disabled={!isPlayerReady}
          title="Count-in"
          variant={"secondary"}
          size="sm"
          className={`h-8 w-8 p-0 ${countInActive ? "scale-110" : ""}`}
        >
          <Hourglass size={16} />
        </Button>

        <Button
          onClick={toggleMetronome}
          disabled={!isPlayerReady}
          title="Metronome"
          variant={"secondary"}
          size="sm"
          className={`h-8 w-8 p-0 ${metronomeActive ? "scale-110" : ""}`}
        >
          <Metronome size={16} />
        </Button>

        <Button
          onClick={toggleLoop}
          disabled={!isPlayerReady}
          title="Loop"
          variant={"secondary"}
          size="sm"
          className={`h-8 w-8 p-0 ${loopActive ? "scale-110" : ""}`}
        >
          <Repeat size={16} />
        </Button>
      </div>

      {/* Utilities */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          onClick={() => apiRef?.print()}
          disabled={!isPlayerReady}
          title="Print"
          variant={"secondary"}
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Printer size={16} />
        </Button>

        {editorShow && (
          <Button
            onClick={onShowEditorModal}
            disabled={!isPlayerReady}
            title="Edit"
            variant={"secondary"}
            size="sm"
            className={`h-8 w-8 p-0 ${editorActive ? "bg-zinc-500" : ""}`}
          >
            <Pencil size={16} />
          </Button>
        )}

        <ZoomControl apiRef={apiRef} />
        <LayoutControl apiRef={apiRef} />
        <Button
          onClick={handleExport}
          disabled={!isPlayerReady}
          title="Export to JSON"
          variant={"secondary"}
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Video size={16}/>
        </Button>
      </div>
    </div>
  );
}
