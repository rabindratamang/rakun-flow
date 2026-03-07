"use client";

import { useState, useCallback } from "react";
import { Play } from "lucide-react";

interface UrlBarProps {
  onLoad: (url: string) => void;
  initialUrl?: string;
}

export function UrlBar({ onLoad, initialUrl = "" }: UrlBarProps) {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      const trimmed = url.trim();
      if (!trimmed) {
        setError("Please enter a stream URL");
        return;
      }
      try {
        new URL(trimmed);
      } catch {
        setError("Please enter a valid URL");
        return;
      }
      onLoad(trimmed);
    },
    [url, onLoad]
  );

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#121212]">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-xl flex-col gap-4 px-6"
      >
        <label htmlFor="stream-url" className="text-sm font-medium text-[#00f2ff]">
          HLS stream URL
        </label>
        <div className="flex gap-2">
          <input
            id="stream-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/live/stream.m3u8"
            className="min-h-[44px] flex-1 rounded-lg border border-[#333] bg-[#1a1a1a] px-4 text-foreground placeholder:text-zinc-500 focus:border-[#00f2ff] focus:outline-none focus:ring-1 focus:ring-[#00f2ff] transition-[border-color,box-shadow] duration-200 ease-in-out"
            autoFocus
          />
          <button
            type="submit"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-[#00f2ff] text-[#121212] transition-[opacity,transform] duration-200 ease-in-out hover:opacity-90 active:scale-95"
            aria-label="Load stream"
          >
            <Play className="h-5 w-5" />
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
