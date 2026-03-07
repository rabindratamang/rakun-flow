import Hls, { type Level } from "hls.js";

const HLS_MIME = "application/vnd.apple.mpegurl";

/** Minimum interval (ms) between fetches to the same URL to reduce manifest/playlist polling. */
const MIN_PLAYLIST_FETCH_INTERVAL_MS = 1000;

const lastFetchByUrl = new Map<string, number>();

function throttleFetchSetup(
  context: { url: string; responseType?: string },
  initParams: RequestInit
): Promise<Request> {
  const url = context.url;
  const now = Date.now();
  const last = lastFetchByUrl.get(url) ?? 0;
  const elapsed = now - last;
  const waitMs = Math.max(0, MIN_PLAYLIST_FETCH_INTERVAL_MS - elapsed);

  if (waitMs > 0) {
    return new Promise((resolve) => {
      setTimeout(() => {
        lastFetchByUrl.set(url, Date.now());
        resolve(new Request(url, initParams as RequestInit));
      }, waitMs);
    });
  }
  lastFetchByUrl.set(url, now);
  return Promise.resolve(new Request(url, initParams as RequestInit));
}

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

/**
 * Attach HLS source: use native HLS on Safari, hls.js elsewhere.
 * Returns the Hls instance when using hls.js, or null when using native.
 * Uses a throttled fetch so the same manifest/playlist URL is not requested more than once per 4s.
 */
export function attachHlsSource(
  video: HTMLVideoElement,
  url: string,
  onLevelsLoaded?: (levels: Level[]) => void,
  onError?: (error: unknown) => void
): Hls | null {
  if (canPlayNativeHls(video)) {
    video.src = url;
    return null;
  }
  if (!Hls.isSupported()) {
    onError?.(new Error("HLS is not supported in this browser"));
    return null;
  }
  const hls = new Hls({
    fetchSetup: throttleFetchSetup,
  });
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
      const message = data.error?.message ?? String(data.details ?? "HLS fatal error");
      onError?.(new Error(message));
    }
  });
  return hls;
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
