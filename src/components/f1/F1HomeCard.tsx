"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { useF1Upcoming } from "@/hooks/useF1Upcoming";

const F1_RED = "#E10600";

function formatCountdown(dateStart: string): string {
  const start = new Date(dateStart).getTime();
  const now = Date.now();
  const diff = start - now;
  if (diff <= 0) return "0m";
  const d = Math.floor(diff / (24 * 60 * 60 * 1000));
  const h = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const m = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

function getCountdownParts(dateStart: string): { days: number; hours: number; minutes: number; seconds: number } | null {
  const start = new Date(dateStart).getTime();
  const now = Date.now();
  const diff = start - now;
  if (diff <= 0) return null;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);
  return { days, hours, minutes, seconds };
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Single unit (e.g. 18 + HRS) with flip animation when value changes */
function CountdownUnit({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-shrink flex-col items-center justify-center" style={{ perspective: "120px" }}>
      <span
        key={value}
        className="tabular-nums font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] animate-[countdown-flip_0.35s_ease-out]"
        style={{ fontSize: "clamp(0.875rem, 4vw, 1.75rem)", lineHeight: 1.2 }}
      >
        {value}
      </span>
      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90">
        {label}
      </span>
    </div>
  );
}

export function F1HomeCard() {
  const { meeting, loading, error } = useF1Upcoming();
  const [tick, setTick] = useState(0);
  const status = meeting?.status;
  const eventLabel = meeting?.event_label || "Session";

  const showAnimatedCountdown =
    status === "upcoming" && meeting?.date_start != null;
  const countdownParts = showAnimatedCountdown && meeting?.date_start
    ? getCountdownParts(meeting.date_start)
    : null;

  const statusLine =
    status === "live"
      ? `Live — ${eventLabel}`
      : status === "ended"
        ? "Session ended"
        : !showAnimatedCountdown && meeting?.date_start
          ? `${eventLabel} — Starts in ${formatCountdown(meeting.date_start)}`
          : showAnimatedCountdown
            ? eventLabel
            : null;

  useEffect(() => {
    if (!meeting || status === "ended") return;
    const intervalMs = status === "upcoming" ? 1000 : 60 * 1000;
    const t = setInterval(() => setTick((n) => n + 1), intervalMs);
    return () => clearInterval(t);
  }, [meeting, status]);

  const showRichCard = meeting && !error;
  const isLive = status === "live";
  const isEnded = status === "ended";

  return (
    <Link
      href="/f1"
      className="group relative flex w-full max-w-xl flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950 shadow-lg transition-all duration-300 ease-out hover:border-[#E10600]/50 hover:shadow-[0_0_24px_-4px_rgba(225,6,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#E10600] focus:ring-offset-2 focus:ring-offset-zinc-950"
    >
      {/* Racing stripe accent */}
      <div
        className="absolute left-0 top-0 h-full w-1 shrink-0"
        style={{ background: `linear-gradient(180deg, ${F1_RED} 0%, #b80500 100%)` }}
      />

      {loading && !meeting ? (
        <div className="flex items-center justify-between px-5 py-4 pl-6">
          <span className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Loading…
          </span>
          <ChevronRight className="h-5 w-5 text-zinc-600 transition-colors group-hover:text-[#E10600]" />
        </div>
      ) : showRichCard ? (
        <>
          <div className="flex items-center gap-3 px-5 py-3.5 pl-6">
            <span className="flex shrink-0 items-center">
              <Image
                src="/logos/F1_logo.png"
                alt="F1"
                width={32}
                height={24}
                className="object-contain"
              />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-bold tracking-tight text-white">
                {meeting.meeting_name}
              </h3>
              {meeting.location && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-medium uppercase tracking-wider text-zinc-500">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {meeting.location}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-4 border-t border-zinc-800/80 px-5 py-4 pl-6">
            {meeting.circuit_image && (
              <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/80 ring-1 ring-zinc-700/50">
                <Image
                  src={meeting.circuit_image}
                  alt={meeting.circuit_short_name || "Circuit"}
                  fill
                  className="object-contain p-1"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              {statusLine && (
                <p
                  className={`inline-block rounded-md px-2.5 py-1 text-sm font-bold tabular-nums tracking-wide ${
                    isLive
                      ? "bg-[#E10600]/20 text-[#E10600] ring-1 ring-[#E10600]/40"
                      : isEnded
                        ? "bg-zinc-800 text-zinc-400"
                        : "bg-zinc-800/80 text-[#E10600]"
                  }`}
                >
                  {statusLine}
                </p>
              )}
              {countdownParts && (
                <div
                  data-refresh={tick}
                  className="mt-2 flex min-w-0 items-center justify-between gap-1 rounded-lg px-3 py-2 sm:gap-2"
                  style={{
                    background: "linear-gradient(135deg, #B20000 0%, #8B0000 100%)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                >
                  <CountdownUnit value={pad2(countdownParts.days)} label="DAYS" />
                  <CountdownUnit value={pad2(countdownParts.hours)} label="HRS" />
                  <CountdownUnit value={pad2(countdownParts.minutes)} label="MINS" />
                  <CountdownUnit value={pad2(countdownParts.seconds)} label="SEC" />
                </div>
              )}
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Live stream & standings
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-zinc-500 transition-colors group-hover:text-[#E10600]" />
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between px-5 py-4 pl-6">
          <span className="text-sm font-semibold tracking-tight text-zinc-300">
            F1 — Live stream & standings
          </span>
          <ChevronRight className="h-5 w-5 text-zinc-500 transition-colors group-hover:text-[#E10600]" />
        </div>
      )}
    </Link>
  );
}
