"use client";

import { useCallback, useState } from "react";
import { useAudioStore } from "@/store/audioStore";

const ACCEPTED_TYPES = [
  "audio/wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/m4a",
  "audio/ogg",
  "audio/webm",
];

export default function DropZone() {
  const { audioFile, setAudioFile, clearTranscript, transcript } = useAudioStore();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(
          `Unsupported format: ${file.type}. Use WAV, MP3, M4A, OGG, or WebM.`
        );
        return;
      }

      setError(null);

      // If same file is selected, skip transcription when already loaded
      if (audioFile && audioFile.name === file.name && audioFile.size === file.size && transcript.length > 0) {
        return;
      }

      clearTranscript();
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
            isDeleted: false,
          })
        );
        useAudioStore.getState().setTranscript(words);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Transcription failed");
      } finally {
        setIsTranscribing(false);
      }
    },
    [audioFile, setAudioFile, clearTranscript, transcript.length]
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
    <div className="w-full bg-surface border-b border-gray-200">
      {!audioFile ? (
        <label
          className={`flex flex-col items-center justify-center h-28 px-4 cursor-pointer transition-colors ${
            isDragging
              ? "bg-blue-50 border-2 border-dashed border-primary"
              : "hover:bg-gray-50"
          }`}
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
          <span className="text-gray-500 text-sm">
            {isDragging
              ? "Drop audio file here"
              : "Drop audio file or click to select"}
          </span>
          <span className="text-gray-400 text-xs mt-1">
            WAV, MP3, M4A, OGG, WebM
          </span>
        </label>
      ) : (
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-gray-900 truncate">
              {audioFile.name}
            </span>
            <span className="text-xs text-gray-500">
              {(audioFile.size / 1024 / 1024).toFixed(1)} MB
              {isTranscribing && (
                <span className="ml-2 text-primary">
                  — Transcribing...
                </span>
              )}
            </span>
          </div>
          <label className="text-sm text-primary hover:text-blue-700 cursor-pointer">
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
        <div className="px-4 py-2 bg-red-50 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
