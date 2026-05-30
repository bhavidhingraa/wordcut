"use client";

import { useCallback, useState } from "react";
import { useAudioStore } from "@/store/audioStore";
import { wavesurferController } from "@/lib/wavesurferController";
import ExportModal from "./ExportModal";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

export default function PlaybackBar() {
  const { audioFile, transcript, playback, setPlayback, regions } = useAudioStore();
  const [showExport, setShowExport] = useState(false);

  const handlePlayPause = useCallback(() => {
    const ws = wavesurferController.get();
    if (!ws) return;
    ws.playPause();
  }, []);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const ws = wavesurferController.get();
      if (!ws) return;
      const time = parseFloat(e.target.value);
      ws.seekTo(time / ws.getDuration());
      setPlayback({ currentTime: time });
    },
    [setPlayback]
  );

  const handleSpeedChange = useCallback(
    (speed: number) => {
      const ws = wavesurferController.get();
      if (!ws) return;
      ws.setPlaybackRate(speed, true);
      setPlayback({ speed });
    },
    [setPlayback]
  );

  const handleSkipBackward = useCallback(() => {
    const ws = wavesurferController.get();
    if (!ws || regions.length === 0) return;
    const sorted = [...regions].sort((a, b) => a.startTime - b.startTime);
    const prev = sorted.findLast((r) => r.startTime < playback.currentTime - 0.05);
    if (!prev) return;
    const target = Math.max(0, prev.startTime - 5);
    ws.seekTo(target / playback.duration);
    setPlayback({ currentTime: target });
  }, [regions, playback.currentTime, playback.duration, setPlayback]);

  const handleSkipForward = useCallback(() => {
    const ws = wavesurferController.get();
    if (!ws || regions.length === 0) return;
    const sorted = [...regions].sort((a, b) => a.startTime - b.startTime);
    const next = sorted.find((r) => r.endTime > playback.currentTime + 0.05);
    if (!next) return;
    const target = Math.max(0, next.startTime - 5);
    ws.seekTo(target / playback.duration);
    setPlayback({ currentTime: target });
  }, [regions, playback.currentTime, playback.duration, setPlayback]);

  return (
    <>
      <div
        className="flex-shrink-0 h-20 px-4 flex items-center gap-4"
        style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border)" }}
      >
        <button
          onClick={handlePlayPause}
          disabled={!audioFile}
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 transition-all"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {playback.isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 ml-0.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <button
          onClick={handleSkipBackward}
          disabled={!audioFile || regions.length === 0}
          className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center disabled:opacity-30 transition-all"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
          title="Previous cut region"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polygon points="19,20 9,12 19,4" fill="currentColor" stroke="none" />
            <line x1="4" y1="4" x2="4" y2="20" />
          </svg>
        </button>

        <button
          onClick={handleSkipForward}
          disabled={!audioFile || regions.length === 0}
          className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center disabled:opacity-30 transition-all"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
          title="Next cut region"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polygon points="5,4 15,12 5,20" fill="currentColor" stroke="none" />
            <line x1="20" y1="4" x2="20" y2="20" />
          </svg>
        </button>

        <span className="font-mono text-xs w-20" style={{ color: "var(--text-muted)" }}>
          {formatTime(playback.currentTime)}
        </span>

        <input
          type="range"
          min={0}
          max={playback.duration || 0}
          step={0.01}
          value={playback.currentTime}
          onChange={handleSeek}
          disabled={!audioFile}
          className="flex-1 h-1 disabled:opacity-30"
          style={{ accentColor: "var(--accent)" }}
        />

        <span className="font-mono text-xs w-20 text-right" style={{ color: "var(--text-muted)" }}>
          {playback.duration ? formatTime(playback.duration) : "00:00.00"}
        </span>

        <select
          value={playback.speed}
          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
          disabled={!audioFile}
          className="text-xs rounded px-2 py-1 disabled:opacity-30"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowExport(true)}
          disabled={!audioFile || transcript.length === 0}
          className="text-sm px-3 py-1.5 rounded border transition-colors disabled:opacity-30"
          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
        >
          Export
        </button>
      </div>

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </>
  );
}
