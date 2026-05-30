"use client";

import { useState, useCallback } from "react";
import { useAudioStore } from "@/store/audioStore";
import { exportTrimmedAudio } from "@/lib/ffmpeg";

interface ExportModalProps {
  onClose: () => void;
}

export default function ExportModal({ onClose }: ExportModalProps) {
  const { audioFile, transcript } = useAudioStore();
  const [progress, setProgress] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (!audioFile) return;
    console.log("[export] starting", audioFile.name, transcript.length, "words");
    setIsExporting(true);
    setError(null);
    setProgress(0);

    try {
      console.log("[export] calling exportTrimmedAudio...");
      const audioBlob = await exportTrimmedAudio(audioFile, transcript, setProgress);
      console.log("[export] done, blob size:", audioBlob.size);

      const audioUrl = URL.createObjectURL(audioBlob);
      const audioA = document.createElement("a");
      audioA.href = audioUrl;
      audioA.download = `edited-audio.mp3`;
      audioA.click();
      URL.revokeObjectURL(audioUrl);

      onClose();
    } catch (e) {
      console.error("[export]", e);
      setError(e instanceof Error ? e.message : `Export failed: ${String(e)}`);
    } finally {
      setIsExporting(false);
    }
  }, [audioFile, transcript, onClose]);

  const cutCount = transcript.filter((w) => w.isCut).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="rounded-lg w-80 p-6"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Export Audio
        </h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
          {cutCount} word{cutCount !== 1 ? "s" : ""} will be removed from export
        </p>

        {isExporting && (
          <div className="mb-5">
            <div
              className="h-1 rounded overflow-hidden"
              style={{ background: "var(--border)" }}
            >
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${progress}%`, background: "var(--accent)" }}
              />
            </div>
            <p className="text-xs mt-2 text-center mono" style={{ color: "var(--text-muted)" }}>
              {Math.round(progress)}%
            </p>
          </div>
        )}

        {error && (
          <div
            className="mb-4 text-sm p-3 rounded"
            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
          >
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-ghost text-sm">
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || cutCount === 0}
            className="btn-primary text-sm"
          >
            {isExporting ? "Exporting…" : "Export MP3"}
          </button>
        </div>
      </div>
    </div>
  );
}
