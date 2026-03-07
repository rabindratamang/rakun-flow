"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  attachHlsSource,
  canPlayNativeHls,
  destroyHls,
  isHlsSupported,
} from "@/lib/hls";

export interface HlsLevel {
  height: number;
  width: number;
  bitrate: number;
  name?: string;
}

function mediaErrorMessage(mediaError: MediaError | null | undefined): string {
  if (!mediaError) return "Playback failed. Try another stream or check the URL.";
  switch (mediaError.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return "Playback was aborted.";
    case MediaError.MEDIA_ERR_NETWORK:
      return "Network error. Check your connection and the stream URL.";
    case MediaError.MEDIA_ERR_DECODE:
      return "Unsupported stream. Format or codec is not supported in this browser.";
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "Invalid stream. The URL may be wrong or the format is not supported.";
    default:
      return mediaError.message || "Playback failed. Try another stream or check the URL.";
  }
}

export function useHls(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const hlsRef = useRef<Hls | null>(null);
  const nativeErrorHandlerRef = useRef<(() => void) | null>(null);
  const [levels, setLevels] = useState<HlsLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = auto
  const [error, setError] = useState<Error | null>(null);
  const [source, setSourceState] = useState<string | null>(null);

  const clearSource = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      if (nativeErrorHandlerRef.current) {
        video.removeEventListener("error", nativeErrorHandlerRef.current);
        nativeErrorHandlerRef.current = null;
      }
      setError(null);
      destroyHls(hlsRef.current, video);
      hlsRef.current = null;
    }
    setLevels([]);
    setCurrentLevel(-1);
    setSourceState(null);
  }, [videoRef]);

  const loadSource = useCallback(
    (url: string) => {
      const video = videoRef.current;
      if (!video) return;

      if (nativeErrorHandlerRef.current) {
        video.removeEventListener("error", nativeErrorHandlerRef.current);
        nativeErrorHandlerRef.current = null;
      }
      setError(null);
      destroyHls(hlsRef.current, video);
      hlsRef.current = null;
      setLevels([]);
      setCurrentLevel(-1);

      const hls = attachHlsSource(
        video,
        url,
        (rawLevels) => {
          setLevels(
            rawLevels.map((l) => ({
              height: l.height,
              width: l.width,
              bitrate: l.bitrate,
              name: l.height ? `${l.height}p` : undefined,
            }))
          );
        },
        (err) => setError(err instanceof Error ? err : new Error(String(err)))
      );
      hlsRef.current = hls;
      setSourceState(url);

      if (!hls) {
        const handler = () => {
          setError(new Error(mediaErrorMessage(video.error)));
        };
        nativeErrorHandlerRef.current = handler;
        video.addEventListener("error", handler);
      }
    },
    [videoRef]
  );

  const setLevel = useCallback((levelIndex: number) => {
    setCurrentLevel(levelIndex);
    if (hlsRef.current !== null) {
      hlsRef.current.currentLevel = levelIndex;
    }
  }, []);

  // Sync currentLevel from hls when it auto-switches (e.g. in auto mode)
  useEffect(() => {
    const hls = hlsRef.current;
    if (!hls) return;
    const onLevelSwitch = (_e: unknown, data: { level: number }) => {
      setCurrentLevel(data.level);
    };
    hls.on(Hls.Events.LEVEL_SWITCHED, onLevelSwitch);
    return () => {
      hls.off(Hls.Events.LEVEL_SWITCHED, onLevelSwitch);
    };
  }, [source]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video) destroyHls(hlsRef.current, video);
      hlsRef.current = null;
    };
  }, [videoRef]);

  return {
    loadSource,
    clearSource,
    levels,
    currentLevel,
    setLevel,
    error,
    source,
    isNativeHls: (() => {
      const v = videoRef.current;
      return v ? canPlayNativeHls(v) : false;
    })(),
    isHlsSupported: isHlsSupported(),
    hlsRef,
  };
}
