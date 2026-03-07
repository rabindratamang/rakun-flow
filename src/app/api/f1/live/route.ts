import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const OPENF1_BASE = "https://api.openf1.org/v1";
// Stay within OpenF1 limits: 3 req/s, 30 req/min. We do 4 req per refresh → max 7 refresh/min → ~8.6s between refreshes. Use 10s for headroom.
const CACHE_TTL_MS = 10_000;
const DELAY_BETWEEN_REQUESTS_MS = 400; // 4 req over ~1.6s = under 3 req/s

type CacheEntry = {
  data: F1LivePayload;
  expiresAt: number;
};

let cache: CacheEntry | null = null;

export interface F1LivePayload {
  session: F1Session | null;
  positions: F1Position[];
  intervals: F1Interval[];
  drivers: F1Driver[];
}

interface F1Session {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  country_name?: string;
  location?: string;
  status?: string;
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

export async function GET() {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return NextResponse.json(cache.data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  try {
    const data = await fetchLiveData();
    cache = {
      data,
      expiresAt: now + CACHE_TTL_MS,
    };
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (cache) {
      return NextResponse.json(cache.data, {
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
