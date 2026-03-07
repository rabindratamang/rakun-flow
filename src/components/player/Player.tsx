"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onCanPlay = () => setIsLoading(false);
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

  const showControls =
    controls.controlsVisible ||
    !controls.isPlaying ||
    (typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches);

  // On touch devices, auto-hide controls after 3s when playing
  useEffect(() => {
    if (
      !hls.source ||
      !controls.isPlaying ||
      typeof window === "undefined" ||
      !window.matchMedia("(hover: none)").matches
    )
      return;
    const t = setTimeout(() => controls.hideControls(), 3000);
    return () => clearTimeout(t);
  }, [hls.source, controls.isPlaying, controls]);

  const handleContainerMouseMove = useCallback(() => {
    controls.showControls();
  }, [controls]);
  const handleContainerMouseLeave = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches) {
      controls.hideControls();
    }
  }, [controls]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="application"
      aria-label="Video player"
      className="relative flex min-h-screen w-full flex-col bg-[#121212] outline-none"
      onMouseMove={handleContainerMouseMove}
      onMouseLeave={handleContainerMouseLeave}
    >
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          className="max-h-full w-full max-w-full object-contain"
          playsInline
          onClick={() => {
            controls.togglePlay();
            controls.showControls();
          }}
          crossOrigin="anonymous"
        />
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
