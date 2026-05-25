"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import HoverPlugin from "wavesurfer.js/dist/plugins/hover.esm.js";
import { Play, Pause, Plus, Trash2, Upload, Wand2, Download, Expand, X, SkipForward } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { AudioSegment, TimelineState } from "../types";
import { formatTime, initializeSegments } from "../utils";
import { loadFFmpeg, processAudio } from "@/lib/audioProcessor";
import type { Cut } from "@/lib/audioProcessor";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const DEFAULT_AUDIO = "https://wavesurfer.xyz/wavesurfer-code/examples/audio/audio.wav";
const MIN_ZOOM = 10;
const MAX_ZOOM = 500;
const DEFAULT_ZOOM = 50;

export default function AudioTimelineEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<RegionsPlugin | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipTargetRef = useRef<number>(0);
  const segmentsRef = useRef<AudioSegment[]>([]);
  const skipModeRef = useRef<boolean>(false);

  const [state, setState] = useState<TimelineState>({
    audioUrl: DEFAULT_AUDIO,
    isPlaying: false,
    currentTime: 0,
    zoomLevel: DEFAULT_ZOOM,
    segments: initializeSegments(),
    isReady: false,
  });

  const [transcript, setTranscript] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [fileName, setFileName] = useState("audio_clip.wav");
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [fullTextModal, setFullTextModal] = useState<string | null>(null);
  const [skipMode, setSkipMode] = useState(true);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  useEffect(() => {
    loadFFmpeg().then(() => setFfmpegLoaded(true)).catch(console.error);
  }, []);

  useEffect(() => {
    segmentsRef.current = state.segments;
  }, [state.segments]);

  useEffect(() => {
    skipModeRef.current = skipMode;
  }, [skipMode]);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    text: string;
    subText: string;
    transcript?: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    text: "",
    subText: "",
  });

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#d1d5db",
      progressColor: "#6366f1",
      cursorColor: "#4f46e5",
      cursorWidth: 2,
      height: 150,
      normalize: true,
      minPxPerSec: state.zoomLevel,
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

    regions.enableDragSelection({
      color: "rgba(239, 68, 68, 0.25)",
    });

    ws.load(state.audioUrl!).catch((err) => {
      if (err && err.name === "AbortError") return;
      if (err && err.message && err.message.includes("abort")) return;
      console.error("WaveSurfer load error:", err);
    });

    ws.on("ready", () => {
      setState((s) => ({ ...s, isReady: true }));
      state.segments.forEach((seg) => {
        regions.addRegion({
          id: seg.id,
          start: seg.startTime,
          end: seg.endTime,
          color: "rgba(239, 68, 68, 0.25)",
          drag: true,
          resize: true,
        });
      });
    });

    ws.on("play", () => setState((s) => ({ ...s, isPlaying: true })));
    ws.on("pause", () => setState((s) => ({ ...s, isPlaying: false })));
    ws.on("timeupdate", (currentTime) => {
      if (skipModeRef.current && segmentsRef.current.length > 0) {
        const inCutRegion = segmentsRef.current.some(
          (seg) => currentTime >= seg.startTime && currentTime <= seg.endTime
        );
        if (inCutRegion) {
          const skipTo = findNextValidTime(currentTime, segmentsRef.current);
          if (skipTo !== null) {
            ws.seekTo(skipTo / ws.getDuration());
          }
        }
      }
      setState((s) => ({ ...s, currentTime }));
    });

    let activeRegionId: string | null = null;

    regions.on("region-created", (region: Region) => {
      setState((s) => {
        if (s.segments.some((seg) => seg.id === region.id)) return s;
        if (region.element) {
          region.element.style.borderLeft = "2px solid #ef4444";
          region.element.style.borderRight = "2px solid #ef4444";
        }
        return {
          ...s,
          segments: [
            ...s.segments,
            {
              id: region.id,
              startTime: region.start,
              endTime: region.end,
              label: "New Segment",
            },
          ],
        };
      });
    });

    regions.on("region-updated", (region: Region) => {
      setState((s) => ({
        ...s,
        segments: s.segments.map((seg) =>
          seg.id === region.id
            ? { ...seg, startTime: region.start, endTime: region.end }
            : seg
        ),
      }));
      setTooltip((t) => ({ ...t, visible: false }));
    });

    const handleMouseMove = (e: MouseEvent) => {
      if (!regionsPluginRef.current) return;
      const regionsList = regionsPluginRef.current.getRegions();
      let hoveredRegion = null;
      let minDuration = Infinity;

      for (const region of regionsList) {
        if (!region.element) continue;
        const rect = region.element.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          const duration = region.end - region.start;
          if (duration < minDuration) {
            hoveredRegion = region;
            minDuration = duration;
          }
        }
      }

      if (hoveredRegion) {
        const seg = state.segments.find((s) => s.id === hoveredRegion.id);
        if (seg) {
          setTooltip({
            visible: true,
            x: e.clientX,
            y: e.clientY - 40,
            text: seg.label,
            subText: `${formatTime(hoveredRegion.start)} - ${formatTime(hoveredRegion.end)}`,
            transcript: seg.transcript,
          });
          activeRegionId = hoveredRegion.id;
        }
      } else if (activeRegionId) {
        activeRegionId = null;
        setTooltip((t) => ({ ...t, visible: false }));
      }
    };

    const handleMouseLeave = () => {
      setTooltip((t) => ({ ...t, visible: false }));
      activeRegionId = null;
    };

    if (containerRef.current) {
      containerRef.current.addEventListener("mousemove", handleMouseMove);
      containerRef.current.addEventListener("mouseleave", handleMouseLeave);
    }

    const handleWheel = (e: WheelEvent) => {
      if (!ws) return;
      if (!e.ctrlKey && !e.metaKey) return;

      e.preventDefault();

      const currentZoom = ws.options.minPxPerSec;
      const zoomDelta = Math.abs(e.deltaY) > 50 ? (e.deltaY < 0 ? 20 : -20) : (e.deltaY < 0 ? 5 : -5);
      const newZoom = Math.max(MIN_ZOOM, Math.min(currentZoom + zoomDelta, MAX_ZOOM));

      ws.zoom(newZoom);
      setState((s) => ({ ...s, zoomLevel: newZoom }));
    };

    if (containerRef.current) {
      containerRef.current.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      ws.destroy();
      if (containerRef.current) {
        containerRef.current.removeEventListener("mousemove", handleMouseMove);
        containerRef.current.removeEventListener("mouseleave", handleMouseLeave);
        containerRef.current.removeEventListener("wheel", handleWheel);
      }
    };
  }, []);

  useEffect(() => {
    if (regionsPluginRef.current) {
      const regions = regionsPluginRef.current.getRegions();
      regions.forEach((region) => {
        if (region.element) {
          region.element.style.borderLeft = "2px solid #ef4444";
          region.element.style.borderRight = "2px solid #ef4444";
        }
      });
    }
  }, [state.segments]);

  // Sync regions when segments change
  useEffect(() => {
    const regions = regionsPluginRef.current;
    if (!regions || !wavesurferRef.current) {
      console.log("Regions sync skipped: regions or ws not ready");
      return;
    }

    const currentRegionIds = new Set(regions.getRegions().map(r => r.id));
    const segmentIds = new Set(state.segments.map(s => s.id));

    console.log("Syncing regions:", { currentRegionIds: [...currentRegionIds], segmentIds: [...segmentIds] });

    currentRegionIds.forEach(id => {
      if (!segmentIds.has(id)) {
        const region = regions.getRegions().find(r => r.id === id);
        if (region) region.remove();
      }
    });

    state.segments.forEach(seg => {
      if (!currentRegionIds.has(seg.id)) {
        console.log("Adding region:", seg.id, seg.startTime, seg.endTime);
        regions.addRegion({
          id: seg.id,
          start: seg.startTime,
          end: seg.endTime,
          color: "rgba(239, 68, 68, 0.25)",
          drag: true,
          resize: true,
        });
      }
    });
  }, [state.segments]);

  const findNextValidTime = (currentTime: number, segments: AudioSegment[]): number | null => {
    const sortedCuts = [...segments].sort((a, b) => a.startTime - b.startTime);
    for (const seg of sortedCuts) {
      if (currentTime >= seg.startTime && currentTime < seg.endTime) {
        return seg.endTime;
      }
    }
    return null;
  };

  const togglePlayMode = useCallback(() => {
    if (wavesurferRef.current && state.isReady) {
      wavesurferRef.current.playPause();
    }
  }, [state.isReady]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setFileName(file.name);
    setUploadedAudioUrl(url);
    setState((s) => ({ ...s, audioUrl: url, segments: [] }));
    wavesurferRef.current?.load(url);
  }, []);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleApplyJson = useCallback(() => {
    if (!jsonInput.trim()) return;
    try {
      const json = JSON.parse(jsonInput);
      const newSegments: AudioSegment[] = json.map((item: { start: string; end: string; before: string; after: string }) => {
        const parseTime = (t: string) => {
          const [min, sec] = t.split(":");
          return parseInt(min) * 60 + parseFloat(sec);
        };
        return {
          id: uuidv4(),
          startTime: parseTime(item.start),
          endTime: parseTime(item.end),
          label: item.after || "Cut",
          transcript: item.before,
        };
      });

      setState((s) => ({
        ...s,
        segments: newSegments,
      }));
      setJsonInput("");
    } catch (err) {
      console.error("JSON parse failed:", err);
      alert("Invalid JSON format");
    }
  }, [jsonInput]);

  const handleAnalyze = useCallback(async () => {
    if (!transcript.trim()) return;

    setAnalyzing(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      const data = await response.json();
      if (data.error) {
        console.error("Analyze error:", data.error);
        return;
      }

      const cuts: Cut[] = data.cuts || [];

      const newSegments: AudioSegment[] = cuts.map((cut) => ({
        id: uuidv4(),
        startTime: cut.startTime,
        endTime: cut.endTime,
        label: cut.suggestedCut || "Cut",
        transcript: cut.original,
      }));

      setState((s) => {
        if (uploadedAudioUrl) {
          return { ...s, segments: newSegments, audioUrl: uploadedAudioUrl };
        }
        return { ...s, segments: newSegments };
      });
    } catch (err) {
      console.error("Analyze failed:", err);
    } finally {
      setAnalyzing(false);
    }
  }, [transcript, uploadedAudioUrl]);

  const handleExport = useCallback(async () => {
    if (state.segments.length === 0 || !wavesurferRef.current) {
      console.log("Export blocked: no segments or no wavesurfer");
      return;
    }

    setExporting(true);
    try {
      const audioSrc = uploadedAudioUrl || state.audioUrl;
      if (!audioSrc) return;

      const response = await fetch(audioSrc);
      const audioData = await response.arrayBuffer();
      const uint8Array = new Uint8Array(audioData);

      const cuts: Cut[] = state.segments.map((seg) => ({
        startTime: seg.startTime,
        endTime: seg.endTime,
        original: seg.transcript || seg.label,
        suggestedCut: seg.label,
        reason: "",
      }));

      const blob = await processAudio(uint8Array, cuts);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.replace(/\.[^.]+$/, "_trimmed.mp3");
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Check console for details.");
    } finally {
      setExporting(false);
    }
  }, [state.segments, fileName, uploadedAudioUrl, state.audioUrl]);

  const addRegion = useCallback(() => {
    if (!wavesurferRef.current || !regionsPluginRef.current || !state.isReady) return;

    const duration = wavesurferRef.current.getDuration();
    const startTime = wavesurferRef.current.getCurrentTime();
    const endTime = Math.min(startTime + 2, duration);

    const newRegionId = uuidv4();
    regionsPluginRef.current.addRegion({
      id: newRegionId,
      start: startTime,
      end: endTime,
      color: "rgba(239, 68, 68, 0.25)",
      drag: true,
      resize: true,
    });
  }, [state.isReady]);

  const deleteSegment = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      segments: s.segments.filter((seg) => seg.id !== id),
    }));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-6 font-sans">
      {/* Header & Controls */}
      <Card className="w-full max-w-5xl mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              size="icon"
              onClick={togglePlayMode}
              disabled={!state.isReady}
              variant={state.isReady ? "default" : "secondary"}
              className="rounded-full"
            >
              {state.isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
            </Button>

            <Button
              size="icon"
              onClick={() => setSkipMode(!skipMode)}
              disabled={!state.isReady || state.segments.length === 0}
              variant={skipMode ? "default" : "secondary"}
              className={cn(
                "rounded-full",
                skipMode && "bg-green-600 hover:bg-green-700"
              )}
            >
              <SkipForward size={18} fill={skipMode ? "currentColor" : "none"} />
            </Button>

            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">{fileName}</span>
              <span className="text-xs text-gray-500 font-mono tracking-wider">
                Current: {formatTime(state.currentTime)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={triggerFileInput}>
              <Upload size={16} />
              Upload
            </Button>
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-400 font-mono uppercase tracking-widest">Zoom</span>
              <span className="text-sm text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded">
                {state.zoomLevel} px/s
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <div
            ref={containerRef}
            className="w-full relative cursor-text outline-none focus:outline-none"
            tabIndex={0}
            title="Pinch trackpad or hold Ctrl and scroll to zoom"
          />

          {/* Hover Tooltip */}
          {tooltip.visible && (
            <div
              className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full flex flex-col items-center drop-shadow-md max-w-xs"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              <div className="bg-gray-900 text-white text-xs py-2 px-3 rounded shadow-lg flex flex-col items-center text-center">
                <span className="font-semibold">{tooltip.text}</span>
                <span className="text-gray-400 font-mono mt-0.5">{tooltip.subText}</span>
                {tooltip.transcript && (
                  <p className="mt-2 pt-2 border-t border-gray-700 text-gray-300 italic text-[11px] leading-relaxed w-full">
                    &quot;{tooltip.transcript}&quot;
                  </p>
                )}
              </div>
              <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcript Input + Analyze */}
      <Card className="w-full max-w-5xl mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <CardTitle>Transcript</CardTitle>
            <Button
              onClick={handleAnalyze}
              disabled={!transcript.trim() || analyzing}
              size="sm"
            >
              <Wand2 size={16} />
              {analyzing ? "Analyzing..." : "Analyze"}
            </Button>
          </div>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste your transcript here..."
            className="w-full h-32 p-3 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </CardContent>
      </Card>

      {/* JSON Input + Apply */}
      <Card className="w-full max-w-5xl mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <CardTitle>JSON Cuts</CardTitle>
            <Button
              onClick={handleApplyJson}
              disabled={!jsonInput.trim()}
              size="sm"
            >
              <Wand2 size={16} />
              Apply
            </Button>
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='Paste JSON cuts here, e.g.: [{"start": "0:40", "end": "0:52", "before": "...", "after": "..."}]'
            className="w-full h-24 p-3 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
          />
        </CardContent>
      </Card>

      {/* Active Cuts Table */}
      <Card className="w-full max-w-5xl">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4">
            <CardTitle>Active Cuts</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExport}
                disabled={state.segments.length === 0 || exporting || !ffmpegLoaded}
                size="sm"
              >
                <Download size={16} />
                {exporting ? "Exporting..." : "Export"}
              </Button>
              {!ffmpegLoaded && <span className="text-xs text-gray-400">Loading...</span>}
              <Button onClick={addRegion} disabled={!state.isReady} size="sm" variant="outline">
                <Plus size={16} />
                Add Cut
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Before</TableHead>
                <TableHead>After</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.segments.map((seg) => (
                <TableRow key={seg.id}>
                  <TableCell className="flex items-center gap-2 max-w-xs truncate">
                    <span className="truncate">{seg.transcript}</span>
                    {seg.transcript && seg.transcript.length > 50 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setFullTextModal(seg.transcript || null)}
                      >
                        <Expand size={14} />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Badge variant="destructive">{seg.label}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{formatTime(seg.startTime)}</TableCell>
                  <TableCell className="font-mono text-sm">{formatTime(seg.endTime)}</TableCell>
                  <TableCell className="font-mono text-sm">{formatTime(seg.endTime - seg.startTime)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => deleteSegment(seg.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {state.segments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No active cuts. Upload audio, paste transcript, click Analyze.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Full Text Modal */}
      {fullTextModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-lg w-full mx-4">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Original Text</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFullTextModal(null)}
                >
                  <X size={20} />
                </Button>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{fullTextModal}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}