"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import type { HlsLevel } from "./hooks/useHls";

interface QualitySelectorProps {
  levels: HlsLevel[];
  currentLevel: number;
  onSelect: (levelIndex: number) => void;
}

export function QualitySelector({
  levels,
  currentLevel,
  onSelect,
}: QualitySelectorProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const label =
    currentLevel === -1
      ? "Auto"
      : levels[currentLevel]?.name ?? `Level ${currentLevel}`;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] items-center gap-1 rounded px-2 text-sm text-foreground transition-opacity duration-200 ease-in-out hover:opacity-90"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Quality"
      >
        <span>{label}</span>
        <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute bottom-full left-0 mb-1 max-h-48 min-w-[100px] overflow-auto rounded-lg border border-[#333] bg-[#1a1a1a] py-1 shadow-lg"
        >
          <li role="option" aria-selected={currentLevel === -1}>
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors duration-200 ease-in-out"
              onClick={() => {
                onSelect(-1);
                setOpen(false);
              }}
            >
              Auto
            </button>
          </li>
          {levels.map((level, i) => (
            <li key={i} role="option" aria-selected={currentLevel === i}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors duration-200 ease-in-out"
                onClick={() => {
                  onSelect(i);
                  setOpen(false);
                }}
              >
                {level.name ?? `${level.width}x${level.height}`}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
