"use client";

import { useCallback, useState } from "react";
import { useAudioStore } from "@/store/audioStore";

const ACCEPTED_TYPES = ["audio/mp3", "audio/mpeg"];

export default function DropZone() {
  const { setAudioFile, audioFile } = useAudioStore();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`Unsupported format: ${file.type}. Use MP3 only.`);
        return;
      }
      setAudioFile(file);
    },
    [setAudioFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}>
      {!audioFile ? (
        <label
          className="flex flex-col items-center justify-center cursor-pointer transition-all duration-150"
          style={{ height: "88px" }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={handleInputChange}
            className="sr-only"
          />
          <div
            style={{
              padding: "20px 32px",
              border: `2px dashed ${isDragging ? "var(--accent)" : "var(--border)"}`,
              borderRadius: "8px",
              width: "100%",
              maxWidth: "480px",
              transition: "border-color 0.15s",
              background: isDragging ? "rgba(245,158,11,0.05)" : "transparent",
            }}
          >
            <span
              className="text-sm font-medium"
              style={{ color: isDragging ? "var(--accent)" : "var(--text-secondary)" }}
            >
              {isDragging ? "Drop MP3 here" : "Drop MP3 or click to select"}
            </span>
            <span className="text-xs mt-1 block" style={{ color: "var(--text-muted)" }}>
              MP3 only
            </span>
          </div>
        </label>
      ) : (
        <div className="flex items-center justify-between px-4" style={{ height: "52px" }}>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
              {audioFile.name}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {(audioFile.size / 1024 / 1024).toFixed(1)} MB
            </span>
          </div>
          <label
            className="text-sm cursor-pointer transition-colors"
            style={{ color: "var(--accent)" }}
          >
            <input
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={handleInputChange}
              className="sr-only"
            />
            Upload
          </label>
        </div>
      )}

      {error && (
        <div
          className="px-4 py-2 text-sm"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
        >
          {error}
        </div>
      )}
    </div>
  );
}