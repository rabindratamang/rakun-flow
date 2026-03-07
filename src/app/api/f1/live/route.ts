import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const OPENF1_BASE = "https://api.openf1.org/v1";
// Stay within OpenF1 limits: 3 req/s, 30 req/min.
const CACHE_TTL_WHEN_ONGOING_MS = 10_000; // refresh every 10s when race is ongoing
const CACHE_TTL_WHEN_NOT_ONGOING_MS = 24 * 60 * 60 * 1000; // 24h when not ongoing
const MEETING_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h for current/upcoming meeting info
const DELAY_BETWEEN_REQUESTS_MS = 400; // 4 req over ~1.6s = under 3 req/s

type LiveCacheEntry = {
  data: F1LivePayload;
  expiresAt: number;
};

type MeetingCacheEntry = {
  data: F1MeetingInfo | null;
  expiresAt: number;
};

let liveCache: LiveCacheEntry | null = null;
let meetingCache: MeetingCacheEntry | null = null;

/** Current/upcoming meeting info (same shape as upcoming route payload). */
export interface F1MeetingInfo {
  meeting_name: string;
  date_start: string;
  date_end?: string;
  circuit_short_name: string;
  circuit_image: string | null;
  country_name: string;
  location: string;
  event_label?: string;
  status?: "live" | "upcoming" | "ended";
}

export interface F1LivePayload {
  session: F1Session | null;
  positions: F1Position[];
  intervals: F1Interval[];
  drivers: F1Driver[];
  meeting?: F1MeetingInfo | null;
}

interface F1Session {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  date_start?: string;
  date_end?: string;
  country_name?: string;
  location?: string;
  status?: string;
}

interface OpenF1SessionLatest {
  session_key?: number;
  meeting_key?: number;
  session_type?: string;
  session_name?: string;
  date_start?: string;
  date_end?: string;
}

interface OpenF1Meeting {
  meeting_key?: number;
  meeting_name?: string;
  circuit_short_name?: string;
  circuit_image?: string;
  country_name?: string;
  location?: string;
}

interface F1Driver {
  driver_number: number;
  name_acronym: string;
  name_full?: string;
  team_name?: string;
  session_key: number;
}

interface F1Position {
  position: number;
  driver_number: number;
  session_key: number;
  date?: string;
}

interface F1Interval {
  driver_number: number;
  gap_to_leader?: number;
  interval?: number;
  session_key: number;
  date?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchOpenF1<T>(path: string): Promise<T> {
  const res = await fetch(`${OPENF1_BASE}${path}`, {
    next: { revalidate: 0 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`OpenF1 ${res.status}`);
  return res.json();
}

/** Fetch OpenF1 path; on non-2xx returns null so we can keep other 200 responses. */
async function fetchOpenF1Optional<T>(path: string): Promise<T | null> {
  const res = await fetch(`${OPENF1_BASE}${path}`, {
    next: { revalidate: 0 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

/** Keep only the latest record per driver_number (by date) so we don't show duplicates. */
function latestPositionPerDriver(rows: F1Position[]): F1Position[] {
  const byDriver = new Map<number, F1Position>();
  for (const row of rows) {
    const existing = byDriver.get(row.driver_number);
    const rowDate = row.date ? new Date(row.date).getTime() : 0;
    const existingDate = existing?.date
      ? new Date(existing.date).getTime()
      : 0;
    if (!existing || rowDate > existingDate) {
      byDriver.set(row.driver_number, row);
    }
  }
  return [...byDriver.values()];
}

function latestIntervalPerDriver(rows: F1Interval[]): F1Interval[] {
  const byDriver = new Map<number, F1Interval>();
  for (const row of rows) {
    const existing = byDriver.get(row.driver_number);
    const rowDate = row.date ? new Date(row.date).getTime() : 0;
    const existingDate = existing?.date
      ? new Date(existing.date).getTime()
      : 0;
    if (!existing || rowDate > existingDate) {
      byDriver.set(row.driver_number, row);
    }
  }
  return [...byDriver.values()];
}

/** One entry per driver_number (OpenF1 may return duplicates). */
function uniqueDrivers(rows: F1Driver[]): F1Driver[] {
  const byDriver = new Map<number, F1Driver>();
  for (const row of rows) {
    byDriver.set(row.driver_number, row);
  }
  return [...byDriver.values()];
}

/** Determine if the latest session is ongoing (now between date_start and date_end). */
async function isSessionOngoing(): Promise<boolean> {
  const sessions = await fetchOpenF1Optional<OpenF1SessionLatest[]>(
    "/sessions?session_key=latest"
  );
  const session = Array.isArray(sessions) && sessions.length > 0 ? sessions[0] : null;
  if (!session?.date_start || !session?.date_end) return false;
  const now = Date.now();
  const start = new Date(session.date_start).getTime();
  const end = new Date(session.date_end).getTime();
  return now >= start && now <= end;
}

function sessionToEventLabel(session: OpenF1SessionLatest): string {
  const name = session.session_name ?? "";
  const type = session.session_type ?? "";
  if (name === "Practice 1") return "FP1";
  if (name === "Practice 2") return "FP2";
  if (name === "Practice 3") return "FP3";
  if (name === "Sprint Qualifying") return "Sprint Qualifying";
  if (name === "Qualifying") return "Qualifying";
  if (name === "Sprint" && type === "Race") return "Sprint";
  if (name === "Race") return "Race";
  if (name.startsWith("Day ")) return "Practice";
  return name || "Session";
}

/** Fetch current/upcoming meeting info (same shape as upcoming route). Used when ongoing; cached 24h. */
async function getCurrentMeetingForLive(): Promise<F1MeetingInfo | null> {
  const year = new Date().getFullYear();
  const now = Date.now();

  const latestList = await fetchOpenF1Optional<OpenF1SessionLatest[]>(
    "/sessions?session_key=latest"
  );
  await delay(DELAY_BETWEEN_REQUESTS_MS);
  const latest = Array.isArray(latestList) && latestList.length > 0 ? latestList[0] : null;
  if (!latest?.meeting_key) return null;

  const meetingKey = latest.meeting_key;
  const sessionsRes = await fetch(
    `${OPENF1_BASE}/sessions?meeting_key=${meetingKey}&year=${year}`,
    { next: { revalidate: 0 }, headers: { Accept: "application/json" } }
  );
  if (!sessionsRes.ok) return null;
  const allSessions: OpenF1SessionLatest[] = await sessionsRes.json();
  await delay(DELAY_BETWEEN_REQUESTS_MS);
  const sessions = (Array.isArray(allSessions) ? allSessions : [])
    .filter((s) => s.date_start != null)
    .sort(
      (a, b) =>
        new Date(a.date_start!).getTime() - new Date(b.date_start!).getTime()
    );

  let targetSession: OpenF1SessionLatest | null = null;
  let status: "live" | "upcoming" | "ended" = "ended";

  const liveSession = sessions.find((s) => {
    const start = new Date(s.date_start!).getTime();
    const end = s.date_end ? new Date(s.date_end).getTime() : start + 1;
    return now >= start && now <= end;
  });
  if (liveSession) {
    targetSession = liveSession;
    status = "live";
  } else {
    const nextSession = sessions.find((s) => new Date(s.date_start!).getTime() > now);
    if (nextSession) {
      targetSession = nextSession;
      status = "upcoming";
    }
  }

  const meetingsRes = await fetch(`${OPENF1_BASE}/meetings?year=${year}`, {
    next: { revalidate: 0 },
    headers: { Accept: "application/json" },
  });
  if (!meetingsRes.ok) return null;
  const meetings: OpenF1Meeting[] = await meetingsRes.json();
  const meeting = (Array.isArray(meetings) ? meetings : []).find(
    (m) => m.meeting_key === meetingKey
  );
  if (!meeting?.meeting_name) return null;

  const event_label = targetSession ? sessionToEventLabel(targetSession) : undefined;
  const date_start = targetSession?.date_start ?? "";
  const date_end = targetSession?.date_end ?? undefined;

  return {
    meeting_name: meeting.meeting_name,
    date_start,
    date_end,
    circuit_short_name: meeting.circuit_short_name ?? "",
    circuit_image: meeting.circuit_image ?? null,
    country_name: meeting.country_name ?? "",
    location: meeting.location ?? "",
    event_label,
    status,
  };
}

async function fetchLiveData(): Promise<F1LivePayload> {
  const sessions = await fetchOpenF1<F1Session[]>(
    "/sessions?session_key=latest"
  );
  await delay(DELAY_BETWEEN_REQUESTS_MS);

  const session =
    Array.isArray(sessions) && sessions.length > 0 ? sessions[0] : null;
  const sessionKey = session?.session_key;

  if (sessionKey == null) {
    return { session: null, positions: [], intervals: [], drivers: [] };
  }

  const positionsRaw = await fetchOpenF1Optional<F1Position[]>(
    `/position?session_key=${sessionKey}`
  );
  await delay(DELAY_BETWEEN_REQUESTS_MS);
  const intervalsRaw = await fetchOpenF1Optional<F1Interval[]>(
    `/intervals?session_key=${sessionKey}`
  );
  await delay(DELAY_BETWEEN_REQUESTS_MS);
  const drivers = await fetchOpenF1Optional<F1Driver[]>(
    `/drivers?session_key=${sessionKey}`
  );

  const positions = latestPositionPerDriver(
    Array.isArray(positionsRaw) ? positionsRaw : []
  );
  const intervals = latestIntervalPerDriver(
    Array.isArray(intervalsRaw) ? intervalsRaw : []
  );

  return {
    session,
    positions,
    intervals,
    drivers: uniqueDrivers(Array.isArray(drivers) ? drivers : []),
  };
}

function buildResponsePayload(): F1LivePayload {
  const base = liveCache!.data;
  const meeting = meetingCache?.data ?? base.meeting;
  return { ...base, meeting };
}

export async function GET() {
  const now = Date.now();

  try {
    const isOngoing = await isSessionOngoing();
    await delay(DELAY_BETWEEN_REQUESTS_MS);

    // Have cache and race is not ongoing: return cache, do not refetch
    if (liveCache && !isOngoing) {
      return NextResponse.json(buildResponsePayload(), {
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Ongoing: refresh live every 10s; refresh meeting info when expired (24h)
    if (isOngoing) {
      if (!liveCache || liveCache.expiresAt <= now) {
        const data = await fetchLiveData();
        liveCache = {
          data,
          expiresAt: now + CACHE_TTL_WHEN_ONGOING_MS,
        };
      }
      if (!meetingCache || meetingCache.expiresAt <= now) {
        const meeting = await getCurrentMeetingForLive().catch(() => null);
        meetingCache = {
          data: meeting,
          expiresAt: now + MEETING_CACHE_TTL_MS,
        };
      }
      return NextResponse.json(buildResponsePayload(), {
        headers: { "Cache-Control": "no-store" },
      });
    }

    // No cache and not ongoing: fetch once, cache 24h
    if (!liveCache) {
      const data = await fetchLiveData();
      liveCache = {
        data,
        expiresAt: now + CACHE_TTL_WHEN_NOT_ONGOING_MS,
      };
    }

    return NextResponse.json(buildResponsePayload(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    if (liveCache) {
      return NextResponse.json(buildResponsePayload(), {
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json(
      {
        session: null,
        positions: [],
        intervals: [],
        drivers: [],
        error: e instanceof Error ? e.message : "Failed to fetch F1 data",
      },
      { status: 502 }
    );
  }
}
