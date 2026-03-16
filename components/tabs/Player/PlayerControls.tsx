'use client'

import { Hourglass, Metronome, Pause, Pencil, Play, Printer, Repeat, StepBack } from "lucide-react";
import { useState } from "react";
import ZoomControl from "../UI/ZoomControl";
import LayoutControl from "../UI/LayoutControl";
import { AlphaTabApi } from "@/types/alphaTab";
import * as alphaTab from '@coderline/alphatab'
import { Button } from "@/components/ui/button";
import TrackSelector from "./TrackSelector";

interface Position {
  current: string;
  total: string;
}

interface PlayerControlProps {
  apiRef: AlphaTabApi | null;
  isPlayerReady: boolean;
  isPlaying: boolean;
  position: Position;
  tracks: alphaTab.model.Track[];
  onShowEditor: () => void;
}

export function PlayerControl({
  apiRef,
  isPlayerReady,
  isPlaying,
  position,
  tracks,
  onShowEditor
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

  return (
    <div className="flex items-center justify-between w-full">
      {/* Far left: Playback controls */}
      <div className="flex items-center gap-2">
        <Button
          onClick={stop}
          disabled={!isPlayerReady}
          title="Stop / Reset"
          variant={"secondary"}
        >
          <StepBack size={18} />
        </Button>

        <TrackSelector
          tracks={tracks}
          apiRef={apiRef}
        />

        <Button
          onClick={togglePlay}
          disabled={!isPlayerReady}
          title={isPlaying ? "Pause" : "Play"}
          variant={isPlaying ? "secondary" : "outline"}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </Button>
      </div>

      {/* Time display */}
      <div className="flex items-center">
        <span className="text-sm font-mono px-3 py-1.5 rounded-md border">
          {position.current} / {position.total}
        </span>
      </div>

      {/* Slight right of center: Settings controls */}
      <div className="flex items-center gap-2">
        <Button
          onClick={toggleCountIn}
          disabled={!isPlayerReady}
          title="Count-in"
          variant={"secondary"}
        >
          <Hourglass size={18} className={`${countInActive ? 'scale-110' : ''}`} />
        </Button>

        <Button
          onClick={toggleMetronome}
          disabled={!isPlayerReady}
          title="Metronome"
          variant={"secondary"}
        >
          <Metronome size={18} className={`${metronomeActive ? 'scale-110' : ''}`} />
        </Button>

        <Button
          onClick={toggleLoop}
          disabled={!isPlayerReady}
          title="Loop"
          variant={"secondary"}
        >
          <Repeat size={18} className={`${loopActive ? 'scale-110' : ''}`} />
        </Button>
      </div>

      {/* Far right: Utilities */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => apiRef?.print()}
          disabled={!isPlayerReady}
          title="Print"
          variant={"secondary"}
        >
          <Printer size={18} />
        </Button>

        <Button
          onClick={onShowEditor}
          disabled={!isPlayerReady}
          title="Edit"
          variant={"secondary"}
        >
          <Pencil size={18} />
        </Button>

        <ZoomControl apiRef={apiRef} />
        <LayoutControl apiRef={apiRef}/>
      </div>
    </div>
  );
}