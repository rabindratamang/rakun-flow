export interface F1StreamOption {
  name: string;
  url: string;
}

export const F1_STREAMS: F1StreamOption[] = [
  { name: "Stream 1", url: "aHR0cHM6Ly93aGlvZWZ3aGkuc2Vuc2Utc2NyYW1ibGUtYmF5Lnh5ei9vdXQvdjIvZGQxZWRlYzIwMGZmYzMyZjUyYTEzYmYyMTkwOGVlMmMvaW5kZXgubTN1OA==" },
  { name: "Stream 2", url: "aHR0cHM6Ly93aGlvZWZ3aGkuc2Vuc2Utc2NyYW1ibGUtYmF5Lnh5ei9vdXQvdjIvZDEzM2FhMjQ0YTk0MjFhZTk5YTIwNTE5M2M1YmFiMWEvaW5kZXgubTN1OA==" },
  { name: "Low res", url: "aHR0cHM6Ly93aGlvZWZ3aGkuc2Vuc2Utc2NyYW1ibGUtYmF5Lnh5ei9vdXQvdjIvYTZmOTUzNDUyMGQxNWFiNGEyOTNiMmUzMzc5NDk3ODkvaW5kZXgubTN1OA==" },
  { name: "Spanish", url: "aHR0cHM6Ly93aGlvZWZ3aGkuc2Vuc2Utc2NyYW1ibGUtYmF5Lnh5ei9vdXQvdjIvYTZmOTUzNDUyMGQxNWFiNGEyOTNiMmUzMzc5NDk3ODkvaW5kZXgubTN1OA==" },
];

function decodeBase64Url(encoded: string): string {
  if (typeof atob !== "undefined") return atob(encoded);
  return Buffer.from(encoded, "base64").toString("utf-8");
}

/** Returns predefined F1 streams with URLs decoded at runtime. Use when passing to Player. */
export function getF1StreamsDecoded(): F1StreamOption[] {
  return F1_STREAMS.map((s) => ({ name: s.name, url: decodeBase64Url(s.url) }));
}
