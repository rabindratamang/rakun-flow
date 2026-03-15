import Hls, { type Level } from "hls.js";

const HLS_MIME = "application/vnd.apple.mpegurl";

/**
 * Whether the browser supports native HLS (e.g. Safari).
 */
export function canPlayNativeHls(video: HTMLVideoElement): boolean {
  return video.canPlayType(HLS_MIME) === "probably" || video.canPlayType(HLS_MIME) === "maybe";
}

/**
 * Whether we should use hls.js (MSE) for HLS.
 */
export function isHlsSupported(): boolean {
  return Hls.isSupported();
}

/** True when running on a device we treat as iPhone (native HLS preferred for compatibility). */
function isLikelyIPhone(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPod/.test(navigator.userAgent) || navigator.platform === "iPhone" || navigator.platform === "iPod";
}

/**
 * Attach HLS source: use native HLS on iPhone (Safari), hls.js on iPad/desktop when supported.
 * Returns the Hls instance when using hls.js, or null when using native.
 * On iPad/desktop, hls.js is preferred when supported so the proxy’s Range/206 behavior is used.
 */
export function attachHlsSource(
  video: HTMLVideoElement,
  url: string,
  onLevelsLoaded?: (levels: Level[]) => void,
  onError?: (error: unknown) => void
): Hls | null {
  const nativeOk = canPlayNativeHls(video);
  const hlsJsOk = Hls.isSupported();

  if (isLikelyIPhone() && nativeOk) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[hls] using native HLS (iPhone)", { url: url.slice(0, 80) });
    }
    video.src = url;
    return null;
  }
  if (hlsJsOk) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[hls] using hls.js (MSE)", { url: url.slice(0, 80) });
    }
    const hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
      onLevelsLoaded?.(data.levels);
    });
    hls.on(Hls.Events.LEVEL_LOADED, (_event, data) => {
      onLevelsLoaded?.(hls.levels);
    });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        const message = getHlsFatalErrorMessage(data);
        onError?.(new Error(message));
      }
    });
    return hls;
  }
  if (nativeOk) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[hls] using native HLS (fallback)", { url: url.slice(0, 80) });
    }
    video.src = url;
    return null;
  }
  onError?.(new Error("Unsupported stream. HLS is not supported in this browser."));
  return null;
}

/** Map hls.js fatal error to a precise user-facing message: network, invalid, or unsupported. */
function getHlsFatalErrorMessage(data: { type?: string; details?: string }): string {
  const type = data.type ?? "";
  const details = data.details ?? "";
  const networkDetails = [
    "manifestLoadError",
    "manifestLoadTimeOut",
    "levelLoadError",
    "levelLoadTimeOut",
    "fragLoadError",
    "fragLoadTimeOut",
    "keyLoadError",
    "keyLoadTimeOut",
    "audioTrackLoadError",
    "audioTrackLoadTimeOut",
    "subtitleTrackLoadError",
    "subtitleTrackLoadTimeOut",
    "assetListLoadError",
    "assetListLoadTimeout",
  ];
  const invalidDetails = [
    "manifestParsingError",
    "levelParsingError",
    "fragParsingError",
    "levelEmptyError",
    "assetListParsingError",
  ];
  const unsupportedDetails = [
    "manifestIncompatibleCodecsError",
    "bufferAddCodecError",
    "bufferIncompatibleCodecsError",
    "attachMediaError",
  ];
  if (type === "networkError" || networkDetails.includes(details)) {
    return "Network error. Check your connection and the stream URL.";
  }
  if (invalidDetails.includes(details)) {
    return "Invalid stream. The URL may be wrong or the response is not valid HLS.";
  }
  if (type === "mediaError" || unsupportedDetails.includes(details)) {
    return "Unsupported stream. Format or codec is not supported in this browser.";
  }
  if (details.includes("Key") || type === "keySystemError") {
    return "Unsupported stream. DRM or encryption is not supported.";
  }
  return "Playback failed. Try another stream or check the URL.";
}

/**
 * Destroy hls.js instance and clear video source.
 */
export function destroyHls(hls: Hls | null, video: HTMLVideoElement): void {
  if (hls) {
    hls.destroy();
  }
  video.removeAttribute("src");
  video.load();
}
