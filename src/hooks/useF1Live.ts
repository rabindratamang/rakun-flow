"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const F1_API = "/api/f1/live";
// Match server cache TTL (10s) so we stay within OpenF1 30 req/min and 3 req/s
const POLL_INTERVAL_MS = 1500;

export interface F1Session {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  country_name?: string;
  location?: string;
  status?: string;
}

export interface F1Driver {
  driver_number: number;
  name_acronym: string;
  name_full?: string;
  team_name?: string;
  session_key: number;
}

export interface F1Position {
  position: number;
  driver_number: number;
  session_key: number;
  date?: string;
}

export interface F1Interval {
  driver_number: number;
  gap_to_leader?: number;
  interval?: number;
  session_key: number;
  date?: string;
}

export interface F1LiveState {
  session: F1Session | null;
  positions: F1Position[];
  intervals: F1Interval[];
  drivers: F1Driver[];
  loading: boolean;
  error: string | null;
}

export function useF1Live(): F1LiveState & { refetch: () => Promise<void> } {
  const [session, setSession] = useState<F1Session | null>(null);
  const [positions, setPositions] = useState<F1Position[]>([]);
  const [intervals, setIntervals] = useState<F1Interval[]>([]);
  const [drivers, setDrivers] = useState<F1Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(F1_API);
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error ?? `Request failed ${res.status}`;
        throw new Error(msg);
      }
      setSession(data.session ?? null);
      setPositions(Array.isArray(data.positions) ? data.positions : []);
      setIntervals(Array.isArray(data.intervals) ? data.intervals : []);
      setDrivers(Array.isArray(data.drivers) ? data.drivers : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load F1 data");
      setSession(null);
      setPositions([]);
      setIntervals([]);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    intervalRef.current = setInterval(refetch, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refetch]);

  return {
    session,
    positions,
    intervals,
    drivers,
    loading,
    error,
    refetch,
  };
}
