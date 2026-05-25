"use client";

import DropZone from "@/components/DropZone";
import TranscriptEditor from "@/components/TranscriptEditor";
import PlaybackBar from "@/components/PlaybackBar";
import RestoreBanner from "@/components/RestoreBanner";
import WaveformEditor from "@/components/WaveformEditor";
import CutTextInput from "@/components/CutTextInput";
import { useAudioStore } from "@/store/audioStore";

export default function Home() {
  const hasAudio = useAudioStore((s) => s.audioFile !== null);

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--bg-base)" }}>
      <RestoreBanner />
      <div className="flex-shrink-0">
        <DropZone />
      </div>
      {hasAudio && (
        <>
          <div className="flex-shrink-0">
            <WaveformEditor />
          </div>
          <div className="flex-shrink-0">
            <CutTextInput />
          </div>
          <div className="flex-1 overflow-hidden">
            <TranscriptEditor />
          </div>
          <div className="flex-shrink-0">
            <PlaybackBar />
          </div>
        </>
      )}
      {!hasAudio && (
        <div
          className="flex-1 flex flex-col items-center justify-center"
          style={{ background: "var(--bg-base)" }}
        >
          <div className="text-center max-w-md px-6">
            <h1
              className="text-4xl font-bold mb-3"
              style={{ color: "var(--text-primary)", fontFamily: "Syne, sans-serif" }}
            >
              WordCut
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Upload an MP3. Type words to remove them. Export clean audio.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
