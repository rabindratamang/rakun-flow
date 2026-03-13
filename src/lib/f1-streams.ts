export interface F1StreamOption {
  name: string;
  url: string;
}

export const F1_STREAMS: F1StreamOption[] = [
  { name: "Sky Moto", url: "aHR0cHM6Ly9kYXNoLnNlcnZlcGxheS5zaXRlL2V2ZW50MDEvdHJhY2tzLXYxYTEvc3R5bGUuY3Nz" },
  { name: "F1 Italy", url: "aHR0cHM6Ly9kYXNoLnNlcnZlcGxheS5zaXRlL2V2ZW50MDQvdHJhY2tzLXYxYTEvc3R5bGUuY3Nz" },
  { name: "F1 Spain", url: "aHR0cHM6Ly9kYXNoLnNlcnZlcGxheS5zaXRlL2V2ZW50MDUvdHJhY2tzLXYxYTEvc3R5bGUuY3Nz" },
  { name: "360p LR", url: "aHR0cHM6Ly9kYXNoLnNlcnZlcGxheS5zaXRlL2V2ZW50MDIvdHJhY2tzLXYxYTEvc3R5bGUuY3Nz" },
];

function decodeBase64Url(encoded: string): string {
  if (typeof atob !== "undefined") return atob(encoded);
  return Buffer.from(encoded, "base64").toString("utf-8");
}

/** Returns predefined F1 streams with URLs decoded at runtime. Use when passing to Player. */
export function getF1StreamsDecoded(): F1StreamOption[] {
  return F1_STREAMS.map((s) => ({ name: s.name, url: decodeBase64Url(s.url) }));
}
