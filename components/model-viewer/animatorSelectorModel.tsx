import Modal from "@/components/ui/modal";
import parser from "@/lib/parser/rawToSelected";
import * as alphaTab from "@coderline/alphatab";
import { useMemo } from "react";

interface AnimatorSelectorModalProps {
  animatorModalActive: boolean;
  onClose: () => void;
  tracks: alphaTab.model.Track[] | null;
  onTrackSelect: (track: alphaTab.model.Track) => void;
  apiRef: alphaTab.AlphaTabApi | null;
  onAnimatorDataUpdate: (data: {
    track: alphaTab.model.Track;
    alphaTex: string;
    parsedTex: string;
    trackName: string;
  }) => void;
}

export default function AnimatorSelectorModal({
  animatorModalActive,
  onClose,
  tracks,
  onTrackSelect,
  apiRef,
  onAnimatorDataUpdate,
}: AnimatorSelectorModalProps) {
  // Filter tracks for animation - you can customize this
  const availableTracks = useMemo(() => {
    if (!tracks || tracks.length === 0) return [];

    return tracks.filter((track) => {
      // Show all tracks that have notes/content
      // You can modify this based on what you want to animate
      const hasContent = track.staves.some(stave => 
        stave.bars.some(bar => bar.voices.some(voice => voice.beats.length > 0))
      );
      return hasContent;
    });
  }, [tracks]);

  function handleSelect(index: number) {
    if (!tracks) {
      console.log("No tracks available");
      return;
    }

    if (!apiRef) {
      console.log("API reference not available");
      return;
    }
    
    if (!apiRef.score) {
      console.log("Score not loaded");
      return;
    }

    const selectedTrack = availableTracks[index];
    const trackName = selectedTrack.name;
    
    // Export full score to AlphaTex
    const exporter = new alphaTab.exporter.AlphaTexExporter();
    const alphaTex = exporter.exportToString(apiRef.score);
    
    // Parse to extract only the selected track
    const parsedTex = parser(alphaTex, trackName);
    
    // Send all data to parent component
    onAnimatorDataUpdate({
      track: selectedTrack,
      alphaTex: alphaTex,      // Full score in AlphaTex format
      parsedTex: parsedTex,    // Only selected track in AlphaTex format
      trackName: trackName,
    });

    onTrackSelect(selectedTrack);
    console.log("Selected track for animation: ", trackName);
    console.log("Parsed AlphaTex length:", parsedTex.length);
    onClose();
  }

  return (
    <Modal
      title="Select Track for Animation"
      isOpen={animatorModalActive}
      onClose={onClose}
    >
      <div className="space-y-2">
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h1 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
            ⚠️ Animation Track Selection
          </h1>
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            Select a track to generate animations/video. The selected track's notes will be used to create visual effects.
            The parser will extract only the selected track's data for processing.
          </p>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Available tracks for animation:
        </p>

        {availableTracks.length === 0 ? (
          <div className="p-4 text-center text-sm text-zinc-500">
            No tracks with content found for animation
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availableTracks.map((track) => {
              // Count notes in track for preview
              const noteCount = track.staves.reduce((count, stave) => {
                return count + stave.bars.reduce((barCount, bar) => {
                  return barCount + bar.voices.reduce((voiceCount, voice) => {
                    return voiceCount + voice.beats.reduce((beatCount, beat) => {
                      return beatCount + beat.notes.length;
                    }, 0);
                  }, 0);
                }, 0);
              }, 0);
              
              return (
                <div
                  key={track.index}
                  className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-purple-500 dark:hover:border-purple-400 transition-colors cursor-pointer group"
                  onClick={() => handleSelect(track.index)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {track.name}
                      </span>
                      <div className="text-xs text-zinc-500 mt-1">
                        Program: {track.playbackInfo.program} | 
                        Notes: {noteCount} | 
                        Volume: {track.playbackInfo.volume}
                      </div>
                    </div>
                    <div className="text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}