/**
 * Map OpenF1 team_name (and common variants) to logo filename in public/logos/.
 * Add new teams here when assets are added.
 */
export const TEAM_LOGO_MAP: Record<string, string> = {
  Alpine: "alpine-normalized-logo.png",
  "Aston Martin": "aston-martin-normalized-logo.png",
  Audi: "audi-normalized-logo.png",
  Cadillac: "cadillac-normalized-logo.png",
  Ferrari: "ferrari-normalized-logo.png",
  Haas: "haas-normalized-logo.png",
  "Haas F1 Team": "haas-normalized-logo.png",
  McLaren: "mclaren-normalized-logo.png",
  Mercedes: "mercedes-normalized-logo.png",
  RB: "rb-normalized-logo.png",
  "Racing Bulls": "rb-normalized-logo.png",
  "Red Bull": "rbr-normalized-logo.png",
  "Red Bull Racing": "rbr-normalized-logo.png",
  Williams: "2026-williams-normalized-logo.png",
};

const LOGOS_BASE = "/logos";

/**
 * Returns the public URL for a team's logo, or null if no mapping exists.
 */
export function getTeamLogoPath(teamName: string | undefined): string | null {
  if (teamName == null || teamName.trim() === "") return null;
  const filename = TEAM_LOGO_MAP[teamName.trim()];
  if (!filename) return null;
  return `${LOGOS_BASE}/${filename}`;
}
