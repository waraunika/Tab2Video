"use client";

import { Pause, Play, TimerReset } from "lucide-react";
import React, { useCallback } from "react";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface ModelCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  playing: boolean;
  currentTime: number;
  duration: number;
}

export default function ModelCanvas({
  canvasRef,
  playing,
  currentTime,
  duration
}: ModelCanvasProps) {
  return (
    <div className="w-full mt-4 rounded-lg overflow-hidden bg-black">
      <canvas 
        ref={canvasRef} 
        style={{ 
          width: "100%",
          display: "block" 
        }} 
      />

      <div
        style={{
          position: "relative",
          marginTop: "-30px",
          padding: "5px 10px",
          background: "rgba(0,0,0,0.7)",
          color: "white",
          fontFamily: "monospace",
          fontSize: "12px",
          display: "inline-block",
          borderRadius: "4px",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  )
}