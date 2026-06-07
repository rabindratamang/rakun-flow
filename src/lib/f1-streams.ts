export interface F1StreamOption {
  name: string;
  url: string;
}

export const F1_STREAMS: F1StreamOption[] = [
  { name: "Stream 1", url: "aHR0cHM6Ly9vZTEub3NzZmVlZC5zdG9yZS9vdXQvdjIvNjI1NjMwYmJlMGIwYWUxMGZjOTIzMmQ4YzkzYTliZmUvaW5kZXgubTN1OA==" },
  { name: "Stream 2", url: "aHR0cHM6Ly9vZTEub3NzZmVlZC5zdG9yZS9vdXQvdjIvOTdmNjdhOGE1Nzc1MDE2ODZlN2UzYTA5YjFmYjI4MzEvaW5kZXgubTN1OA==" },
  { name: "F1 Italy", url: "aHR0cHM6Ly9vZTEub3NzZmVlZC5zdG9yZS9vdXQvdjIvYTEwYzY5ZTUxMDhhNjQ2MGY1ZDc2OTBkNDA1ZTllMDEvaW5kZXgubTN1OA==" },
  { name: "Multi", url: "aHR0cHM6Ly9vZTEub3NzZmVlZC5zdG9yZS9vdXQvdjIvYWUyZmM1YzA0NGM2YTlmOWE5YjcwZmI2OTNiMDQ0NzQvaW5kZXgubTN1OA==" },
];

function decodeBase64Url(encoded: string): string {
  if (typeof atob !== "undefined") return atob(encoded);
  return Buffer.from(encoded, "base64").toString("utf-8");
}

/** Returns predefined F1 streams with URLs decoded at runtime. Use when passing to Player. */
export function getF1StreamsDecoded(): F1StreamOption[] {
  return F1_STREAMS.map((s) => ({ name: s.name, url: decodeBase64Url(s.url) }));
}
