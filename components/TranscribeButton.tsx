"use client";

import { useState, useCallback } from "react";
import { useAudioStore } from "@/store/audioStore";
import { Mic } from "lucide-react";

export default function TranscribeButton() {
  const { audioFile, transcript } = useAudioStore();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doTranscribe = useCallback(async () => {
    if (!audioFile) return;

    setIsTranscribing(true);
    setError(null);
    try {
      const { uploadUrl, publicUrl } = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: audioFile.name, contentType: audioFile.type }),
      }).then((r) => r.json());

      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": audioFile.type },
        body: audioFile,
      });

      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: publicUrl }),
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
  }, [audioFile]);

  const canTranscribe = audioFile && !isTranscribing;

  return (
    <div
      className="flex items-center gap-2 px-4 py-3"
      style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
    >
      <button
        onClick={doTranscribe}
        disabled={!canTranscribe}
        className="btn-primary text-sm flex items-center gap-2"
      >
        <Mic size={16} />
        {isTranscribing ? "Transcribing…" : "Transcribe"}
      </button>
      {error && (
        <span className="text-sm" style={{ color: "#ef4444" }}>
          {error}
        </span>
      )}
      {transcript.length > 0 && (
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {transcript.length} words
        </span>
      )}
    </div>
  );
}
