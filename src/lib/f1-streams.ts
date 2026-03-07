export interface F1StreamOption {
  name: string;
  url: string;
}

/** Predefined F1 stream URLs (HLS manifest). Same path as style.css but stream.m3u8. */
export const F1_STREAMS: F1StreamOption[] = [
  { name: "Sky Moto", url: "aHR0cHM6Ly9kYXNoLnNlcnZlcGxheS5zaXRlL3NreV9tb3RvL3RyYWNrcy12MWExL3N0eWxlLmNzcw==" },
  { name: "F1 Italy", url: "aHR0cHM6Ly9kYXNoLnNlcnZlcGxheS5zaXRlL2YxX2l0YS90cmFja3MtdjFhMS9zdHlsZS5jc3M=" },
  { name: "F1 Spain", url: "aHR0cHM6Ly9kYXNoLnNlcnZlcGxheS5zaXRlL2YxX2VzcC90cmFja3MtdjFhMS9zdHlsZS5jc3M=" },
  { name: "360p LR", url: "aHR0cHM6Ly9kYXNoLnNlcnZlcGxheS5zaXRlL2ZvbmVfbHIvdHJhY2tzLXYxYTEvc3R5bGUuY3Nz" },
];

function decodeBase64Url(encoded: string): string {
  if (typeof atob !== "undefined") return atob(encoded);
  return Buffer.from(encoded, "base64").toString("utf-8");
}

/** Returns predefined F1 streams with URLs decoded at runtime. Use when passing to Player. */
export function getF1StreamsDecoded(): F1StreamOption[] {
  return F1_STREAMS.map((s) => ({ name: s.name, url: decodeBase64Url(s.url) }));
}
