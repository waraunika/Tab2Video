import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import * as alphaTab from '@coderline/alphatab';
import { Drum, Guitar, Piano, Speaker, Zap } from "lucide-react";
import { AlphaTabApi } from "@coderline/alphatab";

interface TrackSelectorProps {
  tracks: alphaTab.model.Track[] | null;
  apiRef: AlphaTabApi | null;
}

export default function TrackSelector({tracks, apiRef}: TrackSelectorProps) {
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);

  function getIcon(track: alphaTab.model.Track) {
    const program = track.playbackInfo.program;
    // reference for program of midi: https://midiprog.com/program-numbers/

    if (program >= 25 && program <= 27 || program === 121) {
      return <Guitar />
    }
    if (program >= 28 && program <= 32) {
      return <Zap />
    }
    if (program >= 33 && program <= 40) {
      return <Speaker />
    }
    if (program >= 41 && program <= 43) {
      return <Piano />
    }
    if (track.isPercussion) {
      return <Drum />
    }
  }

  if (!tracks || tracks.length === 0) {
    return (
      <div>
        <Button variant={"secondary"} disabled>
          No tracks available
        </Button>
      </div>
    )
  }

  function handleTrackSelect(indexString: string) {
    const index = parseInt(indexString);
    setSelectedTrackIndex(index);
    if (apiRef && tracks) {
      apiRef.renderTracks([tracks[index]]);
    }
  }

  return (
    <div className="relative inline-block">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">
            {getIcon(tracks[selectedTrackIndex])}
            {tracks[selectedTrackIndex].name}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="z-50">
          <DropdownMenuRadioGroup
            value={selectedTrackIndex.toString()}
            onValueChange={handleTrackSelect}
          >
            {tracks.map((track, index) => (
              <DropdownMenuRadioItem 
                key={track.name} 
                value={index.toString()}
              >
                {getIcon(track)}
                {track.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}