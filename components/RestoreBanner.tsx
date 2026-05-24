"use client";

import { useEffect, useState } from "react";
import { useAudioStore } from "@/store/audioStore";

export default function RestoreBanner() {
  const { setIsRestoring, transcript } = useAudioStore();
  const [hasStored, setHasStored] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("worddrop-session");
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
    <div className="flex-shrink-0 bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center justify-between">
      <span className="text-sm text-blue-700">
        A previous session was found. Restore your transcript?
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => {
            localStorage.removeItem("worddrop-session");
            setHasStored(false);
          }}
          className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1"
        >
          New session
        </button>
        <button
          onClick={() => {
            setIsRestoring(true);
            setHasStored(false);
          }}
          className="text-sm text-primary hover:text-blue-700 font-medium px-2 py-1"
        >
          Restore
        </button>
      </div>
    </div>
  );
}