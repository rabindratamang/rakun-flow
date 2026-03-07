"use client";

import { useRef, useCallback } from "react";

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export function ProgressBar({
  currentTime,
  duration,
  onSeek,
}: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = barRef.current;
      if (!bar || !Number.isFinite(duration) || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      onSeek(ratio * duration);
    },
    [duration, onSeek]
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={barRef}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={currentTime}
      aria-label="Video progress"
      tabIndex={0}
      className="group h-2 w-full cursor-pointer rounded-full bg-white/20 transition-[height] duration-200 ease-in-out hover:h-2.5"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onSeek(Math.max(0, currentTime - 10));
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          onSeek(Math.min(duration, currentTime + 10));
        }
      }}
    >
      <div
        className="h-full rounded-full bg-[#00f2ff] transition-[width] duration-200 ease-in-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
