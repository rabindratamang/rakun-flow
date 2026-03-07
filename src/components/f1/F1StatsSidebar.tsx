"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useF1Live } from "@/hooks/useF1Live";
import { Loader2, RefreshCw } from "lucide-react";
import type { F1Driver, F1Interval, F1Position } from "@/hooks/useF1Live";
import { getTeamLogoPath } from "@/lib/f1-teams";

function formatGap(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (value === 0) return "—";
  if (value < 1) return `+${value.toFixed(3)}`;
  return `+${value.toFixed(1)}`;
}

export function F1StatsSidebar() {
  const { session, positions, intervals, drivers, loading, error, refetch } =
    useF1Live();

  const driverMap = useMemo(() => {
    const m = new Map<number, F1Driver>();
    drivers.forEach((d) => m.set(d.driver_number, d));
    return m;
  }, [drivers]);

  const latestIntervalByDriver = useMemo(() => {
    const m = new Map<number, F1Interval>();
    intervals.forEach((i) => m.set(i.driver_number, i));
    return m;
  }, [intervals]);

  const standingsRows = useMemo(() => {
    // Best (lowest) position per driver_number from positions API
    const positionByDriver = new Map<number, F1Position>();
    for (const pos of positions) {
      const existing = positionByDriver.get(pos.driver_number);
      if (!existing || pos.position < existing.position) {
        positionByDriver.set(pos.driver_number, pos);
      }
    }
    // Drivers with a position: sorted by position
    const withPosition: Array<{ driver_number: number; position: number; pos: F1Position }> = [...positionByDriver.entries()]
      .map(([driver_number, pos]) => ({ driver_number, position: pos.position, pos }))
      .sort((a, b) => a.position - b.position);
    const driverNumbersWithPosition = new Set(positionByDriver.keys());
    // Drivers with no position: include all from drivers list, sorted by driver_number
    const withoutPosition = drivers
      .filter((d) => !driverNumbersWithPosition.has(d.driver_number))
      .sort((a, b) => a.driver_number - b.driver_number)
      .map((d) => ({ driver_number: d.driver_number, position: null as number | null, pos: null as F1Position | null }));
    return [...withPosition.map((x) => ({ driver_number: x.driver_number, position: x.position as number, pos: x.pos })), ...withoutPosition];
  }, [positions, drivers]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#121212]">
      <header className="shrink-0 border-b border-[#333] px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#00f2ff]">Live F1</h2>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={loading}
            className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-[#00f2ff] disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
        {session && (
          <p className="mt-1 truncate text-xs text-zinc-400">
            {session.session_name}
            {session.status ? ` · ${session.status}` : ""}
          </p>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading && !session && !error && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#00f2ff]" />
          </div>
        )}

        {error && (
          <p className="py-4 text-center text-sm text-red-400">{error}</p>
        )}

        {!loading && !session && !error && (
          <p className="py-4 text-center text-sm text-zinc-500">
            No live session
          </p>
        )}

        {session && (loading ? standingsRows.length > 0 : true) && (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#333] text-zinc-500">
                <th className="py-2 pr-2 font-medium">Pos</th>
                <th className="py-2 pr-2 font-medium">Driver</th>
                <th className="py-2 pr-2 font-medium">Team</th>
                <th className="py-2 text-right font-medium">Gap</th>
              </tr>
            </thead>
            <tbody>
              {standingsRows.map((row) => {
                const driver = driverMap.get(row.driver_number);
                const interval = latestIntervalByDriver.get(row.driver_number);
                const teamLogoPath = getTeamLogoPath(driver?.team_name);
                const position = row.position;
                const gap =
                  position === 1
                    ? null
                    : position != null
                      ? interval?.gap_to_leader ?? interval?.interval
                      : null;
                return (
                  <tr
                    key={row.driver_number}
                    className="border-b border-[#333]/50 transition-colors hover:bg-white/5"
                  >
                    <td className="py-2 pr-2 font-medium text-zinc-300">
                      {position != null ? position : "—"}
                    </td>
                    <td className="py-2 pr-2">
                      <span className="font-medium text-foreground">
                        {driver?.name_acronym ?? `#${row.driver_number}`}
                      </span>
                    </td>
                    <td className="py-2 pr-2 text-zinc-500 max-w-[100px]">
                      <div className="flex items-center gap-1.5 truncate">
                        {teamLogoPath && (
                          <Image
                            src={teamLogoPath}
                            alt=""
                            width={20}
                            height={20}
                            className="size-5 shrink-0 object-contain"
                            title={driver?.team_name}
                          />
                        )}
                        <span className="truncate">
                          {driver?.team_name ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums text-zinc-500">
                      {formatGap(gap)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {session && !loading && standingsRows.length === 0 && (
          <p className="py-4 text-center text-sm text-zinc-500">
            No position data yet
          </p>
        )}
      </div>
    </div>
  );
}
