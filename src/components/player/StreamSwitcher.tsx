"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Radio, Check } from "lucide-react";
import type { F1StreamOption } from "@/lib/f1-streams";

interface StreamSwitcherProps {
  streams: F1StreamOption[];
  currentStreamUrl: string | null;
  onSelectStream: (url: string) => void;
  onOpenChange?: (open: boolean) => void;
}

export function StreamSwitcher({
  streams,
  currentStreamUrl,
  onSelectStream,
  onOpenChange,
}: StreamSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    onOpenChange?.(isOpen);
    return () => {
      onOpenChange?.(false);
    };
  }, [isOpen, onOpenChange]);

  const currentName =
    streams.find((s) => s.url === currentStreamUrl)?.name ?? "Stream";

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, { passive: true });
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen]);

  const handleSelect = (url: string) => {
    onSelectStream(url);
    setIsOpen(false);
  };

  const handleTriggerClick = () => {
    if (!isOpen && buttonRef.current) {
      setTriggerRect(buttonRef.current.getBoundingClientRect());
    }
    setIsOpen((o) => !o);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleTriggerClick}
        className="flex min-h-[44px] items-center gap-1.5 rounded border border-[#333] bg-black/50 px-3 py-2 text-sm text-foreground transition-colors duration-200 ease-in-out hover:border-[#00f2ff]/50 hover:bg-[#252525] focus:border-[#00f2ff] focus:outline-none focus:ring-1 focus:ring-[#00f2ff]"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Switch stream"
      >
        <Radio className="h-4 w-4 shrink-0 text-[#00f2ff]" aria-hidden />
        <span className="max-w-[80px] truncate sm:max-w-[120px] md:max-w-[140px]">
          {currentName}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            {/* Backdrop: full screen on mobile for bottom sheet, transparent on md+ */}
            <div
              className="fixed inset-0 z-[100] bg-black/40 md:bg-transparent"
              aria-hidden
              onClick={() => setIsOpen(false)}
            />
            <div
              role="listbox"
              aria-label="Stream options"
              className="fixed inset-x-0 bottom-0 z-[101] max-h-[50vh] overflow-auto rounded-t-2xl border border-b-0 border-[#333] bg-[#1a1a1a] shadow-2xl md:inset-auto md:max-h-[70vh] md:min-w-[200px] md:rounded-lg md:border md:shadow-xl"
              style={
                triggerRect && typeof window !== "undefined" && window.innerWidth >= 768
                  ? {
                      bottom: `${window.innerHeight - triggerRect.top + 8}px`,
                      left: "auto",
                      right: `${window.innerWidth - triggerRect.right}px`,
                      top: "auto",
                      width: 200,
                    }
                  : undefined
              }
            >
              {/* Drag handle on mobile */}
              <div className="flex justify-center py-2 md:hidden" aria-hidden>
                <div className="h-1 w-10 rounded-full bg-[#333]" />
              </div>
              <ul className="pb-6 md:pb-2 md:pt-2">
                {streams.map((s) => {
                  const isCurrent = s.url === currentStreamUrl;
                  return (
                    <li key={s.url}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isCurrent}
                        onClick={() => handleSelect(s.url)}
                        className="flex min-h-[48px] w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors duration-200 ease-in-out hover:bg-white/5 active:bg-white/10 md:min-h-[44px] md:py-2.5"
                      >
                        {isCurrent ? (
                          <Check className="h-5 w-5 shrink-0 text-[#00f2ff]" aria-hidden />
                        ) : (
                          <span className="w-5 shrink-0" aria-hidden />
                        )}
                        <span className={isCurrent ? "font-medium text-foreground" : "text-zinc-300"}>
                          {s.name}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
