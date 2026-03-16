import * as alphaTab from '@coderline/alphatab'

export interface AlphaTabApi {
  playPause: () => void;
  stop: () => void;
  print: () => void;
  render: () => void;
  renderTracks: (track: alphaTab.model.Track[]) => void;
  updateSettings: () => void;
  destroy: () => void;
  countInVolume: number;
  metronomeVolume: number;
  isLooping: boolean;
  settings: {
    display: {
      scale: number;
      layoutMode: number;
      resources: {
        barNumberColor?: string;
      }
    };
  };
}