"use client";

import { useState, useCallback } from "react";
import { useAudioStore } from "@/store/audioStore";
import { exportTrimmedAudio, generateSRT } from "@/lib/ffmpeg";

interface ExportModalProps {
  onClose: () => void;
}

type ExportType = "audio" | "both";

export default function ExportModal({ onClose }: ExportModalProps) {
  const { audioFile, transcript } = useAudioStore();
  const [exportType, setExportType] = useState<ExportType>("audio");
  const [progress, setProgress] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (!audioFile) return;
    setIsExporting(true);
    setError(null);
    setProgress(0);

    try {
      const audioBlob = await exportTrimmedAudio(audioFile, transcript, setProgress);

      const audioUrl = URL.createObjectURL(audioBlob);
      const audioA = document.createElement("a");
      audioA.href = audioUrl;
      audioA.download = `worddrop-trimmed.mp3`;
      audioA.click();
      URL.revokeObjectURL(audioUrl);

      if (exportType === "both") {
        const srtContent = generateSRT(transcript);
        const srtBlob = new Blob([srtContent], { type: "text/srt" });
        const srtUrl = URL.createObjectURL(srtBlob);
        const srtA = document.createElement("a");
        srtA.href = srtUrl;
        srtA.download = `worddrop-transcript.srt`;
        srtA.click();
        URL.revokeObjectURL(srtUrl);
      }

      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [audioFile, transcript, exportType, onClose]);

  const deletedCount = transcript.filter((w) => w.isDeleted).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface rounded-lg shadow-xl w-80 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Export</h2>

        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-2 block">
            {deletedCount} word{deletedCount !== 1 ? "s" : ""} marked for skip
          </label>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="exportType"
                value="audio"
                checked={exportType === "audio"}
                onChange={() => setExportType("audio")}
              />
              <span className="text-sm text-gray-700">Trimmed audio (MP3)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="exportType"
                value="both"
                checked={exportType === "both"}
                onChange={() => setExportType("both")}
              />
              <span className="text-sm text-gray-700">Audio + transcript (MP3 + SRT)</span>
            </label>
          </div>
        </div>

        {isExporting && (
          <div className="mb-4">
            <div className="h-2 bg-gray-100 rounded overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">{Math.round(progress)}%</p>
          </div>
        )}

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || deletedCount === 0}
            className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}