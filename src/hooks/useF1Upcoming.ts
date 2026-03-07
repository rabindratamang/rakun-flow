"use client";

import { useCallback, useEffect, useState } from "react";

const F1_UPCOMING_API = "/api/f1/upcoming";

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

export interface F1UpcomingState {
  meeting: F1UpcomingMeeting | null;
  loading: boolean;
  error: string | null;
}

export function useF1Upcoming(): F1UpcomingState & { refetch: () => Promise<void> } {
  const [meeting, setMeeting] = useState<F1UpcomingMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(F1_UPCOMING_API);
      const data = await res.json();
      if (!res.ok) {
        setMeeting(null);
        setError(data?.error ?? `Request failed ${res.status}`);
        return;
      }
      setMeeting(data.meeting ?? null);
    } catch (e) {
      setMeeting(null);
      setError(e instanceof Error ? e.message : "Failed to load upcoming race");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch]);

  return { meeting, loading, error, refetch };
}
