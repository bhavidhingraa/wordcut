"use client";

import { useState, useCallback } from "react";
import { useAudioStore } from "@/store/audioStore";
import { Mic } from "lucide-react";

export default function TranscribeButton() {
  const { audioFile, transcript, setPlayback } = useAudioStore();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doTranscribe = useCallback(async () => {
    if (!audioFile) return;

    setIsTranscribing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("audio", audioFile);

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
  }, [audioFile]);

  const canTranscribe = audioFile && transcript.length === 0 && !isTranscribing;
  const alreadyHasTranscript = transcript.length > 0;

  return (
    <div className="flex items-center gap-2 px-4 py-3" style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}>
      <button
        onClick={doTranscribe}
        disabled={!canTranscribe}
        className="btn-primary text-sm flex items-center gap-2"
      >
        <Mic size={16} />
        {isTranscribing ? "Transcribing…" : "Transcribe"}
      </button>
      {error && (
        <span className="text-sm" style={{ color: "#ef4444" }}>{error}</span>
      )}
      {alreadyHasTranscript && (
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {transcript.length} words loaded
        </span>
      )}
    </div>
  );
}