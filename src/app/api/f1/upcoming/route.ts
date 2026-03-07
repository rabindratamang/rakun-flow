import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const OPENF1_BASE = "https://api.openf1.org/v1";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CacheEntry = {
  data: F1UpcomingPayload;
  expiresAt: number;
};

let cache: CacheEntry | null = null;

export type F1SessionStatus = "live" | "upcoming" | "ended";

export interface F1UpcomingMeeting {
  meeting_name: string;
  date_start: string;
  date_end?: string;
  circuit_short_name: string;
  circuit_image: string | null;
  country_name: string;
  location: string;
  event_label?: string;
  status?: F1SessionStatus;
}

export interface F1UpcomingPayload {
  meeting: F1UpcomingMeeting | null;
}

interface OpenF1Meeting {
  meeting_key?: number;
  meeting_name?: string;
  date_start?: string;
  date_end?: string;
  circuit_short_name?: string;
  circuit_image?: string;
  country_name?: string;
  location?: string;
}

interface OpenF1Session {
  session_key?: number;
  meeting_key?: number;
  session_type?: string;
  session_name?: string;
  date_start?: string;
  date_end?: string;
}

/** Map OpenF1 session_name (+ session_type) to display label. */
function sessionToEventLabel(session: OpenF1Session): string {
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

/** Get session-aware meeting: live or next upcoming session at same track; status only "ended" when all events for that track are done. */
async function getCurrentMeeting(): Promise<F1UpcomingMeeting | null> {
  const year = new Date().getFullYear();
  const now = Date.now();

  const latestRes = await fetch(
    `${OPENF1_BASE}/sessions?session_key=latest`,
    { next: { revalidate: 0 }, headers: { Accept: "application/json" } }
  );
  if (!latestRes.ok) return null;
  const latestList: OpenF1Session[] = await latestRes.json();
  const latest = Array.isArray(latestList) ? latestList[0] : null;
  if (!latest?.meeting_key) return null;

  const meetingKey = latest.meeting_key;
  const sessionsRes = await fetch(
    `${OPENF1_BASE}/sessions?meeting_key=${meetingKey}&year=${year}`,
    { next: { revalidate: 0 }, headers: { Accept: "application/json" } }
  );
  if (!sessionsRes.ok) return null;
  const allSessions: OpenF1Session[] = await sessionsRes.json();
  const sessions = (Array.isArray(allSessions) ? allSessions : [])
    .filter((s) => s.date_start != null)
    .sort(
      (a, b) =>
        new Date(a.date_start!).getTime() - new Date(b.date_start!).getTime()
    );

  let targetSession: OpenF1Session | null = null;
  let status: F1SessionStatus = "ended";

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

async function fetchUpcoming(): Promise<F1UpcomingPayload> {
  try {
    const meeting = await getCurrentMeeting();
    return { meeting };
  } catch {
    return { meeting: null };
  }
}

export async function GET() {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return NextResponse.json(cache.data, {
      headers: { "Cache-Control": "no-store" },
    });
  }
  try {
    const data = await fetchUpcoming();
    cache = { data, expiresAt: now + CACHE_TTL_MS };
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    if (cache) {
      return NextResponse.json(cache.data, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json(
      { meeting: null },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
