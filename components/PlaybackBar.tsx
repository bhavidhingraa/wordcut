"use client";

import { useCallback, useRef, useState } from "react";
import { useAudioStore } from "@/store/audioStore";
import ExportModal from "./ExportModal";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

export default function PlaybackBar() {
  const { audioFile, transcript, playback, setPlayback } = useAudioStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [showExport, setShowExport] = useState(false);

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playback.isPlaying) {
      audio.pause();
      setPlayback({ isPlaying: false });
    } else {
      audio.play();
      setPlayback({ isPlaying: true });
    }
  }, [playback.isPlaying, setPlayback]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlayback({ currentTime: audio.currentTime });

    const deletedWord = transcript.find(
      (w) => w.isDeleted && audio.currentTime >= w.start && audio.currentTime < w.end
    );
    if (deletedWord) {
      const nextUndelted = transcript.find(
        (w) => !w.isDeleted && w.start > deletedWord.start
      );
      if (nextUndelted) {
        audio.currentTime = nextUndelted.start;
      } else {
        audio.pause();
        setPlayback({ isPlaying: false, currentTime: audio.duration });
      }
    }
  }, [transcript, setPlayback]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlayback({ duration: audio.duration });
  }, [setPlayback]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = parseFloat(e.target.value);
      setPlayback({ currentTime: audio.currentTime });
    },
    [setPlayback]
  );

  const handleSpeedChange = useCallback(
    (speed: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.playbackRate = speed;
      setPlayback({ speed });
    },
    [setPlayback]
  );

  const objectUrl = audioFile ? URL.createObjectURL(audioFile) : null;

  return (
    <>
      <div className="flex-shrink-0 h-20 bg-surface border-t border-gray-200 px-4 flex items-center gap-4">
        {objectUrl && (
          <audio
            ref={audioRef}
            src={objectUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setPlayback({ isPlaying: false })}
          />
        )}

        <button
          onClick={handlePlayPause}
          disabled={!audioFile}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-30 hover:bg-blue-700 transition-colors"
        >
          {playback.isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <span className="font-mono text-xs text-gray-500 w-20">
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
          className="flex-1 h-1 accent-primary disabled:opacity-30"
        />

        <span className="font-mono text-xs text-gray-400 w-20 text-right">
          {playback.duration ? formatTime(playback.duration) : "00:00.00"}
        </span>

        <select
          value={playback.speed}
          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
          disabled={!audioFile}
          className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 disabled:opacity-30"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>{s}x</option>
          ))}
        </select>

        <button
          onClick={() => setShowExport(true)}
          disabled={!audioFile || transcript.length === 0}
          className="text-sm px-3 py-1.5 rounded border border-primary text-primary hover:bg-blue-50 disabled:opacity-30 transition-colors"
        >
          Export
        </button>
      </div>

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </>
  );
}