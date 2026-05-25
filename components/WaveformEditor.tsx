"use client";

import { useEffect, useRef, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import { useAudioStore } from "@/store/audioStore";
import { computeCutRegionsFromTranscript } from "@/lib/cutManager";

export default function WaveformEditor() {
  const { audioFile, transcript, playback, setPlayback } = useAudioStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<RegionsPlugin | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Initialize wavesurfer
  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#3f3f46",
      progressColor: "#f59e0b",
      cursorColor: "#f59e0b",
      cursorWidth: 2,
      height: 96,
      normalize: true,
      minPxPerSec: 80,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
    });

    const regions = ws.registerPlugin(RegionsPlugin.create());
    wavesurferRef.current = ws;
    regionsPluginRef.current = regions;

    ws.on("ready", () => {
      setPlayback({ duration: ws.getDuration() });
    });

    ws.on("timeupdate", (currentTime) => {
      setPlayback({ currentTime });
    });

    ws.on("play", () => setPlayback({ isPlaying: true }));
    ws.on("pause", () => setPlayback({ isPlaying: false }));

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
      regionsPluginRef.current = null;
    };
  }, []); // eslint-disable-line

  // Load audio when file changes
  useEffect(() => {
    if (!audioFile || !wavesurferRef.current) return;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const url = URL.createObjectURL(audioFile);
    objectUrlRef.current = url;
    wavesurferRef.current.load(url);
    setPlayback({ currentTime: 0, isPlaying: false });
  }, [audioFile]); // eslint-disable-line

  // Sync cut regions when transcript changes
  useEffect(() => {
    const regions = regionsPluginRef.current;
    if (!regions) return;

    regions.getRegions().forEach((r) => r.remove());

    if (transcript.length === 0) return;

    const cutRegions = computeCutRegionsFromTranscript(transcript);

    for (const cut of cutRegions) {
      regions.addRegion({
        id: `cut-${cut.startTime.toFixed(3)}`,
        start: cut.startTime,
        end: cut.endTime,
        color: "rgba(239, 68, 68, 0.28)",
        drag: false,
        resize: true,
      });
    }
  }, [transcript]);

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ background: "var(--bg-surface)" }}
    />
  );
}

// Expose wavesurfer ref for external play/pause control
export function getWavesurfer() {
  return wavesurferRef_current;
}

// Module-level accessor for PlaybackBar
let wavesurferRef_current: WaveSurfer | null = null;
export function setWavesurferRef(ws: WaveSurfer | null) {
  wavesurferRef_current = ws;
}
