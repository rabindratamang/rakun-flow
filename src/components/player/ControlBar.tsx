"use client";

import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture,
} from "lucide-react";
import { ProgressBar } from "./ProgressBar";
import { QualitySelector } from "./QualitySelector";
import type { usePlayerControls } from "./hooks/usePlayerControls";
import type { useHls } from "./hooks/useHls";

interface ControlBarProps {
  controls: ReturnType<typeof usePlayerControls>;
  hls: ReturnType<typeof useHls>;
  visible: boolean;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ControlBar({ controls, hls, visible }: ControlBarProps) {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isFullscreen,
    isPiP,
    togglePlay,
    seekBack,
    seekForward,
    seekTo,
    setVolume,
    toggleMute,
    toggleFullscreen,
    togglePiP,
    piPSupported,
  } = controls;
  const { levels, currentLevel, setLevel } = hls;

  if (!visible) return null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 flex flex-col gap-2 p-2 transition-opacity duration-200 ease-in-out"
      style={{
        backdropFilter: "blur(8px)",
        background: "rgba(0, 0, 0, 0.5)",
      }}
    >
      <ProgressBar
        currentTime={currentTime}
        duration={duration}
        onSeek={seekTo}
      />
      <div className="flex min-h-[44px] items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[#00f2ff] transition-[opacity,color] duration-200 ease-in-out hover:opacity-90"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6" />
          )}
        </button>
        <button
          type="button"
          onClick={seekBack}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-foreground transition-opacity duration-200 ease-in-out hover:opacity-90"
          aria-label="Seek back 10 seconds"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={seekForward}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-foreground transition-opacity duration-200 ease-in-out hover:opacity-90"
          aria-label="Seek forward 10 seconds"
        >
          <RotateCw className="h-5 w-5" />
        </button>
        <div className="flex min-h-[44px] items-center gap-1">
          <button
            type="button"
            onClick={toggleMute}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-foreground transition-opacity duration-200 ease-in-out hover:opacity-90"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="h-2 w-24 accent-[#00f2ff] transition-opacity duration-200 ease-in-out md:w-28"
            aria-label="Volume"
          />
        </div>
        <div className="flex-1" />
        {levels.length > 0 && (
          <QualitySelector
            levels={levels}
            currentLevel={currentLevel}
            onSelect={setLevel}
          />
        )}
        {piPSupported && (
          <button
            type="button"
            onClick={togglePiP}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-foreground transition-opacity duration-200 ease-in-out hover:opacity-90"
            aria-label={isPiP ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
          >
            <PictureInPicture className="h-5 w-5" />
          </button>
        )}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-foreground transition-opacity duration-200 ease-in-out hover:opacity-90"
          aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize className="h-5 w-5" />
          ) : (
            <Maximize className="h-5 w-5" />
          )}
        </button>
      </div>
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
