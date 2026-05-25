"use client";

import { useEffect, useState } from "react";
import { useAudioStore } from "@/store/audioStore";

export default function RestoreBanner() {
  const { setIsRestoring, transcript } = useAudioStore();
  const [hasStored, setHasStored] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("wordcut-session");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.state?.transcript?.length > 0) {
          setHasStored(true);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  if (!hasStored || transcript.length > 0) return null;

  return (
    <div
      className="flex-shrink-0 px-4 py-2 flex items-center justify-between"
      style={{ background: "rgba(245,158,11,0.1)", borderBottom: "1px solid var(--accent)" }}
    >
      <span className="text-sm" style={{ color: "var(--accent)" }}>
        Previous session found — restore transcript?
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => {
            localStorage.removeItem("wordcut-session");
            setHasStored(false);
          }}
          className="text-sm px-2 py-1"
          style={{ color: "var(--text-muted)" }}
        >
          New session
        </button>
        <button
          onClick={() => {
            setIsRestoring(true);
            setHasStored(false);
          }}
          className="text-sm px-2 py-1 font-medium"
          style={{ color: "var(--accent)" }}
        >
          Restore
        </button>
      </div>
    </div>
  );
}
