"use client";

import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import HoverPlugin from "wavesurfer.js/dist/plugins/hover.esm.js";
import { useAudioStore } from "@/store/audioStore";
import { computeCutRegionsFromTranscript } from "@/lib/cutManager";

export default function WaveformEditor() {
  const { audioFile, audioDataUrl, transcript, setPlayback } = useAudioStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<RegionsPlugin | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const MIN_ZOOM = 10;
  const MAX_ZOOM = 500;

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#52525b",
      progressColor: "#6366f1",
      cursorColor: "#4f46e5",
      cursorWidth: 2,
      height: 150,
      normalize: true,
      minPxPerSec: 50,
      plugins: [
        HoverPlugin.create({
          lineColor: "#ef4444",
          lineWidth: 2,
          labelBackground: "#555",
          labelColor: "#fff",
          labelSize: "11px",
        }),
      ],
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

    const handleWheel = (e: WheelEvent) => {
      if (!ws) return;
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) return;

      e.preventDefault();

      const currentZoom = ws.options.minPxPerSec ?? 50;
      const zoomDelta = Math.abs(e.deltaY) > 50 ? (e.deltaY < 0 ? 20 : -10) : (e.deltaY < 0 ? 5 : -5);
      const newZoom = Math.max(MIN_ZOOM, Math.min(currentZoom + zoomDelta, MAX_ZOOM));

      ws.zoom(newZoom);
    };

    containerRef.current.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      try { ws.destroy(); } catch { /* AbortError on cleanup */ }
      if (containerRef.current) {
        containerRef.current.removeEventListener("wheel", handleWheel);
      }
      wavesurferRef.current = null;
      regionsPluginRef.current = null;
    };
  }, []); // eslint-disable-line

  // Load audio from file or dataUrl
  useEffect(() => {
    if (!wavesurferRef.current) return;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    const loadFrom = async () => {
      if (!wavesurferRef.current) return;

      if (audioFile) {
        const url = URL.createObjectURL(audioFile);
        objectUrlRef.current = url;
        wavesurferRef.current.load(url);
      } else if (audioDataUrl) {
        wavesurferRef.current.load(audioDataUrl);
      }
      setPlayback({ currentTime: 0, isPlaying: false });
    };

    loadFrom();
  }, [audioFile, audioDataUrl]); // eslint-disable-line

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
        resize: false,
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