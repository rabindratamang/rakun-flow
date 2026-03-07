"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Loader2, Play } from "lucide-react";
import { useHls } from "./hooks/useHls";
import { usePlayerControls } from "./hooks/usePlayerControls";
import { ControlBar } from "./ControlBar";
import { UrlBar } from "./UrlBar";

export function Player() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showUrlBar, setShowUrlBar] = useState(false);
  const [sourceFromQuery, setSourceFromQuery] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const hls = useHls(videoRef);
  const controls = usePlayerControls(videoRef, containerRef);

  const loadSource = useCallback(
    (url: string) => {
      setIsLoading(true);
      // Use proxy for cross-origin streams to avoid CORS and follow redirects
      const sourceUrl =
        typeof window !== "undefined"
          ? (() => {
              try {
                const u = new URL(url);
                if (u.origin === window.location.origin) return url;
                return `${window.location.origin}/api/stream?url=${encodeURIComponent(url)}`;
              } catch {
                return url;
              }
            })()
          : url;
      hls.loadSource(sourceUrl);
      setShowUrlBar(false);
      setSourceFromQuery(url);
      if (typeof window !== "undefined") {
        const next = new URL(window.location.href);
        next.searchParams.set("stream", encodeURIComponent(url));
        window.history.replaceState({}, "", next.toString());
      }
    },
    [hls]
  );

  const autoPlayDoneRef = useRef(false);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    autoPlayDoneRef.current = false;
    const onCanPlay = () => {
      setIsLoading(false);
      if (!autoPlayDoneRef.current) {
        video.play().catch(() => {});
        autoPlayDoneRef.current = true;
      }
    };
    const onError = () => setIsLoading(false);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);
    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
    };
  }, [hls.source]);

  // Read ?stream= once on mount (client-side). Do not depend on loadSource to avoid infinite loop.
  const initialStreamRead = useRef(false);
  useEffect(() => {
    if (initialStreamRead.current) return;
    initialStreamRead.current = true;
    const params = new URLSearchParams(window.location.search);
    const stream = params.get("stream");
    if (stream) {
      const decoded = decodeURIComponent(stream);
      loadSource(decoded);
    } else {
      setShowUrlBar(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run once on mount only
  }, []);

  // Show URL bar when there's no source and no query param
  const displayUrlBar = showUrlBar && !hls.source;

  // Bar visible when user recently interacted or video is paused. Auto-hide after 1s when playing.
  const showControls = controls.controlsVisible || !controls.isPlaying;

  // Auto-hide controls after 3s when playing (all cases: fullscreen or not)
  const shouldAutoHideControls = hls.source && controls.isPlaying;
  useEffect(() => {
    if (!shouldAutoHideControls) return;
    const t = setTimeout(() => controls.hideControls(), 3000);
    return () => clearTimeout(t);
  }, [shouldAutoHideControls, controls]);

  const handleContainerMouseMove = useCallback(() => {
    controls.showControls();
  }, [controls]);
  const handleContainerMouseLeave = useCallback(() => {}, []);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="application"
      aria-label="Video player"
      className="relative flex h-full w-full min-h-0 flex-col overflow-hidden bg-[#121212] outline-none"
      onMouseMove={handleContainerMouseMove}
      onMouseLeave={handleContainerMouseLeave}
    >
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          className="h-full w-full object-contain transition-[filter] duration-200 ease-in-out"
          style={{ filter: hls.source && !controls.isPlaying && !isLoading ? "blur(8px)" : "none" }}
          playsInline
          onClick={() => {
            if (!controls.isPlaying) controls.play();
            controls.showControls();
          }}
          crossOrigin="anonymous"
        />
        {hls.source && !controls.isPlaying && !isLoading && !hls.error && !displayUrlBar && (
          <button
            type="button"
            onClick={() => {
              controls.play();
              controls.showControls();
            }}
            className="absolute inset-0 z-[1] flex items-center justify-center backdrop-blur-md bg-black/30 transition-opacity duration-200 ease-in-out hover:bg-black/40 focus:outline-none focus:ring-2 focus:ring-[#00f2ff] focus:ring-inset"
            aria-label="Play"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#00f2ff]/90 text-[#121212] transition-transform duration-200 ease-in-out hover:scale-110">
              <Play className="h-10 w-10 ml-1" fill="currentColor" />
            </span>
          </button>
        )}
        {isLoading && hls.source && !hls.error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#121212]/80" aria-hidden="true">
            <Loader2 className="h-12 w-12 animate-spin text-[#00f2ff]" />
          </div>
        )}
        {hls.error && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#121212]/90 p-6"
            role="alert"
          >
            <p className="text-center text-red-400">
              {hls.error.message}
            </p>
            <button
              type="button"
              onClick={() => {
                hls.clearSource();
                setShowUrlBar(true);
              }}
              className="rounded-lg bg-[#00f2ff] px-4 py-2 text-[#121212] transition-opacity duration-200 ease-in-out hover:opacity-90"
            >
              Try another URL
            </button>
          </div>
        )}
        {displayUrlBar && (
          <UrlBar
            onLoad={loadSource}
            initialUrl={sourceFromQuery ?? undefined}
          />
        )}
        {hls.source && !displayUrlBar && (
          <ControlBar
            controls={controls}
            hls={hls}
            visible={showControls}
          />
        )}
      </div>
    </div>
  );
}
