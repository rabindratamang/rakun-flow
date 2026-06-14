export interface F1StreamOption {
  name: string;
  url: string;
}

export const F1_STREAMS: F1StreamOption[] = [
  { name: "Stream 1", url: "aHR0cHM6Ly9vZTEub3NzZmVlZC5zdG9yZS9vdXQvdjIvMmI4NTU0NDM4Y2IzN2Y1ZmZjOGM3OTI5NjJkMmZhYmYvaW5kZXgubTN1OA==" },
  { name: "Stream 2", url: "aHR0cHM6Ly9vZTEub3NzZmVlZC5zdG9yZS9vdXQvdjIvNDc4MjcyZGUxNDk1ZThmM2VjNWNiZTQwOTE1NmQ5ZWMvaW5kZXgubTN1OA==" },
  { name: "F1 Italy", url: "aHR0cHM6Ly9vZTEub3NzZmVlZC5zdG9yZS9vdXQvdjIvOTg0ZTM4OWU3NjQ1NWZmNDIxY2Q0ZjJhYTE5Y2UyZDEvaW5kZXgubTN1OA==" },
  { name: "German", url: "aHR0cHM6Ly9vZTEub3NzZmVlZC5zdG9yZS9vdXQvdjIvYWIzYWViYzI5NDcwZjgzMjlhYmFhMzhhNzJmNDdkYWQvaW5kZXgubTN1OA==" },
];

function decodeBase64Url(encoded: string): string {
  if (typeof atob !== "undefined") return atob(encoded);
  return Buffer.from(encoded, "base64").toString("utf-8");
}

/** Returns predefined F1 streams with URLs decoded at runtime. Use when passing to Player. */
export function getF1StreamsDecoded(): F1StreamOption[] {
  return F1_STREAMS.map((s) => ({ name: s.name, url: decodeBase64Url(s.url) }));
}
