"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SEEK_STEP = 10;

export function usePlayerControls(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const play = useCallback(() => {
    videoRef.current?.play().then(() => setIsPlaying(true));
  }, []);
  const pause = useCallback(() => {
    videoRef.current?.pause();
    setIsPlaying(false);
  }, []);
  const togglePlay = useCallback(() => {
    if (videoRef.current?.paused) play();
    else pause();
  }, [play, pause]);

  const seekBack = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, v.currentTime - SEEK_STEP);
  }, []);
  const seekForward = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(v.duration || 0, v.currentTime + SEEK_STEP);
  }, []);

  const setVolume = useCallback((value: number) => {
    const v = videoRef.current;
    if (v) {
      v.volume = value;
      setVolumeState(value);
      setIsMuted(value === 0);
    }
  }, []);
  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.volume === 0) {
      v.volume = volume || 1;
      setVolumeState(volume || 1);
      setIsMuted(false);
    } else {
      setVolumeState(v.volume);
      v.volume = 0;
      setIsMuted(true);
    }
  }, [volume]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);
  const togglePiP = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else {
        await v.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch {
      // PiP not supported or failed
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    const v = videoRef.current;
    if (v && !Number.isNaN(time)) {
      v.currentTime = Math.max(0, Math.min(time, v.duration || 0));
    }
  }, []);

  // Time updates
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTimeUpdate = () => setCurrentTime(v.currentTime);
    const onDurationChange = () => setDuration(v.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("durationchange", onDurationChange);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("durationchange", onDurationChange);
    v.removeEventListener("play", onPlay);
    v.removeEventListener("pause", onPause);
    };
  }, [videoRef]);

  // Fullscreen change (e.g. user presses Escape)
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // PiP change
  useEffect(() => {
    const onEnterPiP = () => setIsPiP(true);
    const onLeavePiP = () => setIsPiP(false);
    const v = videoRef.current;
    if (!v) return;
    v.addEventListener("enterpictureinpicture", onEnterPiP);
    v.addEventListener("leavepictureinpicture", onLeavePiP);
    return () => {
      v.removeEventListener("enterpictureinpicture", onEnterPiP);
      v.removeEventListener("leavepictureinpicture", onLeavePiP);
    };
  }, [videoRef]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBack();
          break;
        case "ArrowRight":
          e.preventDefault();
          seekForward();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, seekBack, seekForward, containerRef]);

  // Auto-hide controls (mobile): show on move/click, hide after delay
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    hideTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
      hideTimeoutRef.current = null;
    }, 3000);
  }, []);
  const hideControls = useCallback(() => {
    setControlsVisible(false);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const piPSupported =
    typeof document !== "undefined" && document.pictureInPictureEnabled;

  return {
    isPlaying,
    currentTime,
    duration,
    volume: isMuted ? 0 : volume,
    isMuted,
    isFullscreen,
    isPiP,
    controlsVisible,
    showControls,
    hideControls,
    play,
    pause,
    togglePlay,
    seekBack,
    seekForward,
    seekTo,
    setVolume,
    toggleMute,
    toggleFullscreen,
    togglePiP,
    piPSupported,
  };
}
