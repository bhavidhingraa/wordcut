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
          isDeleted: false,
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
        setError(
          `Unsupported format: ${file.type}. Use WAV, MP3, M4A, OGG, or WebM.`
        );
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-lg shadow-xl w-80 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Existing transcript found
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              A transcript for this session already exists. Do you want to transcribe again or keep the existing one?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => pendingConfirm.resolve(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Keep existing
              </button>
              <button
                onClick={() => pendingConfirm.resolve(true)}
                className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-blue-700 transition-colors"
              >
                Transcribe again
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full bg-surface border-b border-gray-200">
        {!useAudioStore.getState().audioFile ? (
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
                {useAudioStore.getState().audioFile?.name}
              </span>
              <span className="text-xs text-gray-500">
                {(useAudioStore.getState().audioFile!.size / 1024 / 1024).toFixed(1)} MB
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
    </>
  );
}
