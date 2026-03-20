import Modal from "@/components/ui/modal";
import parser from "@/lib/parser/rawToSelected";
import * as alphaTab from "@coderline/alphatab";
import { parse } from "path";
import { useMemo } from "react";

interface TrackSelectorModalProps {
  editorModalActive: boolean;
  onClose: () => void;
  tracks: alphaTab.model.Track[] | null;
  onTrackSelect: (index: alphaTab.model.Track) => void;
  apiRef: alphaTab.AlphaTabApi | null;
  onTexUpdate: (tex: string) => void;
}

export default function TrackSelectorModal({
  editorModalActive,
  onClose,
  tracks,
  onTrackSelect,
  apiRef,
  onTexUpdate,
}: TrackSelectorModalProps) {
  // Use useMemo to filter tracks only when tracks array changes
  const guitarTracks = useMemo(() => {
    if (!tracks || tracks.length === 0) return [];
    
    return tracks.filter(track => {
      const program = track.playbackInfo.program;
      return (program >= 25 && program <= 32) || program === 121;
    });
  }, [tracks]);

  function handleSelect(index: number) {
    if (!tracks) return;

    if (!apiRef) {
      console.log('no ref');
      return;
    }
    if (!apiRef.score) {
      console.log("no api ref");
      return;
    }
    const trackName = guitarTracks[index].name;
    const exporter = new alphaTab.exporter.AlphaTexExporter();
    const alphaTex = exporter.exportToString(apiRef.score);    
    const parseText = parser(alphaTex,trackName);
    onTexUpdate(parseText);


    onTrackSelect(tracks[index]);
    console.log("set edit track to ", index);
    onClose();
  }

  return (
    <Modal
      title="Select your track to edit"
      isOpen={editorModalActive}
      onClose={onClose}
    >
      <div className="space-y-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          These are the available guitar tracks:
        </p>
        
        {guitarTracks.length === 0 ? (
          <p className="text-sm text-zinc-500">No guitar tracks found</p>
        ) : (
          <div className="space-y-2">
            {guitarTracks.map((track) => (
              <div
                key={track.name}
                className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => handleSelect(track.index)}
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {track.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}