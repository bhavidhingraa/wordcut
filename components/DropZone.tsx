"use client";

import { useCallback, useState } from "react";
import { useAudioStore } from "@/store/audioStore";

const ACCEPTED_TYPES = ["audio/mp3", "audio/mpeg"];

interface TranscribeConfirm {
  file: File;
  resolve: (value: boolean) => void;
}

export default function DropZone() {
  const { setAudioFile, transcript } = useAudioStore();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<TranscribeConfirm | null>(null);

  const doTranscribe = useCallback(async (file: File) => {
    setError(null);
    setAudioFile(file);

    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", file);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Transcription failed");
      }

      const data = await res.json();
      const words = data.words.map(
        (w: { word: string; start: number; end: number }) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          isCut: false,
        })
      );
      useAudioStore.getState().setTranscript(words);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transcription failed");
    } finally {
      setIsTranscribing(false);
    }
  }, [setAudioFile]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`Unsupported format: ${file.type}. Use MP3 only.`);
        return;
      }

      // If transcript already exists from a restored session, ask before re-transcribing
      if (transcript.length > 0) {
        setPendingConfirm({ file, resolve: (confirmed) => {
          setPendingConfirm(null);
          if (confirmed) {
            doTranscribe(file);
          }
        }});
        return;
      }

      await doTranscribe(file);
    },
    [transcript.length, doTranscribe]
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
    <>
      {pendingConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="rounded-lg p-6 w-80"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Existing transcript found
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
              Replace with a new file or keep current session?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => pendingConfirm.resolve(false)}
                className="btn-ghost text-sm"
              >
                Keep
              </button>
              <button
                onClick={() => pendingConfirm.resolve(true)}
                className="btn-primary text-sm"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}>
        {!useAudioStore.getState().audioFile ? (
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
                background: isDragging ? "var(--accent-glow)" : "transparent",
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
                {useAudioStore.getState().audioFile?.name}
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {(useAudioStore.getState().audioFile!.size / 1024 / 1024).toFixed(1)} MB
                {isTranscribing && (
                  <span className="ml-2" style={{ color: "var(--accent)" }}>
                    — Transcribing…
                  </span>
                )}
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
              Replace
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
    </>
  );
}
