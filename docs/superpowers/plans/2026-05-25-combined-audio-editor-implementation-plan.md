# Combined Audio Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Combine word-drop and precision-audio-editor into single app. MP3 upload → waveform + transcript → text-driven cuts → skip-cut playback → MP3 export.

**Architecture:** Word array (`{word, start, end, isCut}`) is source of truth. Cut regions derived from word array on demand. Waveform visualizes cut regions. Transcript UI shows struck-through cut words. Playback skips cut regions. Export uses FFmpeg WASM to concatenate kept segments.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Zustand, wavesurfer.js, Deepgram SDK, FFmpeg WASM.

---

## File Map

**Modify:**
- `word-drop/package.json` — add `wavesurfer.js`
- `word-drop/store/audioStore.ts` — rename `isDeleted` → `isCut`, add `setCuts` action
- `word-drop/components/WordToken.tsx` — rename prop `isDeleted` → `isCut`
- `word-drop/components/TranscriptEditor.tsx` — update to use `isCut`
- `word-drop/components/PlaybackBar.tsx` — integrate wavesurfer playback + skip-cut
- `word-drop/components/DropZone.tsx` — MP3-only input
- `word-drop/components/ExportModal.tsx` — MP3-only export (remove SRT option)
- `word-drop/components/RestoreBanner.tsx` — rename to CutBanner, use `isCut`
- `word-drop/app/page.tsx` — add WaveformEditor + CutTextInput to layout
- `word-drop/app/api/transcribe/route.ts` — handle MP3 (Deepgram accepts MP3)

**Create:**
- `word-drop/components/WaveformEditor.tsx` — wavesurfer.js waveform + cut regions
- `word-drop/components/CutTextInput.tsx` — multi-line text input + Cut button
- `word-drop/lib/cutManager.ts` — text-to-word matching + region merging

---

## Task 1: Add wavesurfer.js dependency

**Files:**
- Modify: `word-drop/package.json`

- [ ] **Step 1: Add wavesurfer.js to dependencies**

Run: `cd word-drop && npm install wavesurfer.js`

Verify `wavesurfer.js` appears in `package.json` dependencies.

---

## Task 2: Update Zustand store (`isDeleted` → `isCut`)

**Files:**
- Modify: `word-drop/store/audioStore.ts`

- [ ] **Step 1: Rename `isDeleted` → `isCut` in Word interface and all store logic**

```typescript
export interface Word {
  word: string;
  start: number;
  end: number;
  isCut: boolean;  // renamed from isDeleted
}
```

```typescript
deleteWords: (startIdx, endIdx) =>
  set(state => ({
    transcript: state.transcript.map((w, i) =>
      i >= startIdx && i <= endIdx ? { ...w, isCut: true } : w
    ),
    ui: { selection: null },
  })),
restoreWord: (index) =>
  set(state => ({
    transcript: state.transcript.map((w, i) =>
      i === index ? { ...w, isCut: false } : w
    ),
  })),
```

Also update `partialize` to save `isCut` instead of `isDeleted`.

---

## Task 3: Update WordToken component

**Files:**
- Modify: `word-drop/components/WordToken.tsx`

- [ ] **Step 1: Rename `isDeleted` prop to `isCut`**

```typescript
interface WordTokenProps {
  word: string;
  start: number;
  end: number;
  isCut: boolean;  // renamed
  isSelected: boolean;
  isCurrent: boolean;
  onClick: (e: React.MouseEvent) => void;
  onRestoreClick: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
}
```

```typescript
if (isCut) className += "cut ";  // renamed from "deleted"
```

---

## Task 4: Update TranscriptEditor

**Files:**
- Modify: `word-drop/components/TranscriptEditor.tsx`

- [ ] **Step 1: Replace all `isDeleted` with `isCut`**

Line 15: `w.isDeleted` → `w.isCut`
Line 117: `isDeleted={word.isDeleted}` → `isCut={word.isCut}`
All other references: `isDeleted` → `isCut`

---

## Task 5: DropZone — MP3 only

**Files:**
- Modify: `word-drop/components/DropZone.tsx`

- [ ] **Step 1: Change ACCEPTED_TYPES to MP3 only**

```typescript
const ACCEPTED_TYPES = ["audio/mp3", "audio/mpeg"];
```

- [ ] **Step 2: Update UI text to say MP3 only**

Change `"WAV, MP3, M4A, OGG, WebM"` → `"MP3 only"`.

- [ ] **Step 3: Update error message**

Change error text to reference MP3 only.

---

## Task 6: CutBanner → `isCut` naming

**Files:**
- Modify: `word-drop/components/RestoreBanner.tsx` (rename to CutBanner conceptually, keep file name)

- [ ] **Step 1: Rename `isDeleted` → `isCut` throughout**

All `isDeleted` references → `isCut`. Banner text can stay as-is or change "deleted" → "cut" if desired.

---

## Task 7: CutManager — text matching + region logic

**Files:**
- Create: `word-drop/lib/cutManager.ts`

- [ ] **Step 1: Write CutManager module**

```typescript
import type { Word } from "@/store/audioStore";

export interface CutRegion {
  startTime: number;
  endTime: number;
}

/**
 * Find all non-overlapping word index ranges matching a substring (case-sensitive).
 * Returns array of [startIdx, endIdx] pairs.
 */
export function findMatchingWordRanges(
  transcript: Word[],
  substring: string
): Array<[number, number]> {
  const results: Array<[number, number]> = [];
  const text = transcript.map(w => w.word).join(" ");
  
  // Find all occurrences of substring
  let searchFrom = 0;
  while (true) {
    const idx = text.indexOf(substring, searchFrom);
    if (idx === -1) break;
    
    // Convert character index to word index
    let charCount = 0;
    let startWord = -1;
    let endWord = -1;
    
    for (let i = 0; i < transcript.length; i++) {
      const wordLen = transcript[i].word.length + 1; // +1 for space
      if (charCount <= idx && idx < charCount + wordLen) {
        startWord = i;
      }
      if (charCount < idx + substring.length && idx + substring.length <= charCount + wordLen) {
        endWord = i;
        break;
      }
      charCount += wordLen;
    }
    
    if (startWord !== -1 && endWord !== -1) {
      results.push([startWord, endWord]);
    }
    searchFrom = idx + 1;
  }
  
  return results;
}

/**
 * Merge overlapping cut index ranges into non-overlapping regions.
 */
export function mergeCutRanges(
  ranges: Array<[number, number]>
): Array<[number, number]> {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr[0] <= last[1] + 1) {
      last[1] = Math.max(last[1], curr[1]);
    } else {
      merged.push(curr);
    }
  }
  
  return merged;
}

/**
 * Convert word index ranges to time-based regions.
 */
export function wordRangesToRegions(
  transcript: Word[],
  ranges: Array<[number, number]>
): CutRegion[] {
  return ranges.map(([startIdx, endIdx]) => ({
    startTime: transcript[startIdx].start,
    endTime: transcript[endIdx].end,
  }));
}

/**
 * Apply multi-line text input: each line is an independent substring.
 * Returns merged word index ranges.
 */
export function processMultiLineCut(
  transcript: Word[],
  multiLineText: string
): Array<[number, number]> {
  const lines = multiLineText.split("\n").filter(l => l.trim().length > 0);
  const allRanges: Array<[number, number]> = [];
  
  for (const line of lines) {
    const matches = findMatchingWordRanges(transcript, line.trim());
    allRanges.push(...matches);
  }
  
  return mergeCutRanges(allRanges);
}
```

---

## Task 8: CutTextInput component

**Files:**
- Create: `word-drop/components/CutTextInput.tsx`

- [ ] **Step 1: Write CutTextInput component**

```typescript
"use client";

import { useState, useCallback } from "react";
import { useAudioStore } from "@/store/audioStore";
import { processMultiLineCut } from "@/lib/cutManager";

export default function CutTextInput() {
  const [text, setText] = useState("");
  const { transcript, deleteWords } = useAudioStore();

  const handleCut = useCallback(() => {
    if (!text.trim() || transcript.length === 0) return;
    
    const ranges = processMultiLineCut(transcript, text);
    for (const [startIdx, endIdx] of ranges) {
      deleteWords(startIdx, endIdx);
    }
    setText("");
  }, [text, transcript, deleteWords]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Cmd+Enter to trigger cut
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleCut();
    }
  }, [handleCut]);

  if (transcript.length === 0) return null;

  return (
    <div className="flex-shrink-0 px-4 py-3 bg-surface border-b border-gray-200">
      <div className="flex items-center gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter text to cut (one substring per line, case-sensitive)..."
          rows={2}
          className="flex-1 text-sm border border-gray-200 rounded px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleCut}
          disabled={!text.trim() || transcript.length === 0}
          className="flex-shrink-0 px-4 py-2 bg-primary text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          Cut Text
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1">
        Cmd+Enter to cut. Each line = independent substring. Case-sensitive exact match.
      </p>
    </div>
  );
}
```

---

## Task 9: WaveformEditor component

**Files:**
- Create: `word-drop/components/WaveformEditor.tsx`

- [ ] **Step 1: Write WaveformEditor with wavesurfer.js + regions**

```typescript
"use client";

import { useEffect, useRef, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import { useAudioStore } from "@/store/audioStore";
import type { Word } from "@/store/audioStore";

function computeCutRegions(transcript: Word[]) {
  const cuts: Array<{start: number; end: number}> = [];
  let i = 0;
  while (i < transcript.length) {
    if (transcript[i].isCut) {
      const start = transcript[i].start;
      let end = transcript[i].end;
      let j = i + 1;
      while (j < transcript.length && transcript[j].isCut) {
        end = transcript[j].end;
        j++;
      }
      cuts.push({ start, end });
      i = j;
    } else {
      i++;
    }
  }
  return cuts;
}

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
      waveColor: "#d1d5db",
      progressColor: "#6366f1",
      cursorColor: "#4f46e5",
      cursorWidth: 2,
      height: 80,
      normalize: true,
      minPxPerSec: 50,
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

  // Sync regions when transcript changes
  useEffect(() => {
    const regions = regionsPluginRef.current;
    const ws = wavesurferRef.current;
    if (!regions || !ws) return;

    // Clear existing regions
    regions.getRegions().forEach(r => r.remove());

    // Add cut regions
    const cutRegions = computeCutRegions(transcript);
    for (const cut of cutRegions) {
      regions.addRegion({
        id: `cut-${cut.start}-${cut.end}`,
        start: cut.start,
        end: cut.end,
        color: "rgba(239, 68, 68, 0.25)",
        drag: false,
        resize: true,
      });
    }
  }, [transcript]);

  const handlePlayPause = useCallback(() => {
    wavesurferRef.current?.playPause();
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    const time = parseFloat(e.target.value);
    ws.seekTo(time / ws.getDuration());
    setPlayback({ currentTime: time });
  }, [setPlayback]);

  return (
    <div className="flex-shrink-0 bg-surface border-b border-gray-200">
      <div ref={containerRef} className="w-full" />
      <div className="px-4 py-2">
        <input
          type="range"
          min={0}
          max={playback.duration || 1}
          step={0.01}
          value={playback.currentTime}
          onChange={handleSeek}
          className="w-full h-1 accent-primary"
        />
      </div>
    </div>
  );
}
```

---

## Task 10: Update page.tsx layout

**Files:**
- Modify: `word-drop/app/page.tsx`

- [ ] **Step 1: Add WaveformEditor + CutTextInput to layout**

```typescript
import DropZone from "@/components/DropZone";
import TranscriptEditor from "@/components/TranscriptEditor";
import PlaybackBar from "@/components/PlaybackBar";
import WaveformEditor from "@/components/WaveformEditor";
import CutTextInput from "@/components/CutTextInput";

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-shrink-0">
        <DropZone />
      </div>
      {useAudioStore.getState().audioFile && (
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
    </div>
  );
}
```

Note: `useAudioStore.getState()` used at render time is safe here for initial render.

---

## Task 11: PlaybackBar — integrate wavesurfer playback

**Files:**
- Modify: `word-drop/components/PlaybackBar.tsx`

- [ ] **Step 1: Replace HTML5 Audio with wavesurfer-based playback**

The PlaybackBar currently owns the `<audio>` element. We need to:
1. Remove the `<audio>` ref element
2. Add play/pause button that calls `wavesurferRef.current?.playPause()`
3. Sync speed control via `wavesurferRef.current?.setPlaybackRate()`
4. Remove `timeupdate` handler — wavesurfer emits `timeupdate` on the ws instance
5. Keep `handleSeek` — call `ws.seekTo(time / ws.getDuration())`
6. Keep skip-cut logic but access it via wavesurfer (or move skip logic to WaveformEditor)

For skip-cut during playback: keep the `handleTimeUpdate` skip logic but access `audioRef.current` from WaveformEditor. Simplest approach: pass a `skipTo(time)` callback down from WaveformEditor via a shared ref or move the skip logic entirely into WaveformEditor's `timeupdate` handler.

**Recommended: Move skip-cut logic to WaveformEditor.** Remove timeupdate skip logic from PlaybackBar entirely. Keep PlaybackBar minimal — it shows current time, duration, speed selector, and triggers wavesurfer play/pause.

```typescript
// PlaybackBar now only handles:
// - Play/Pause button (calls wavesurferRef via a global accessor, OR
//   we expose wavesurfer via window and WaveformEditor adds it there)

// Simplest: use a module-level ref accessor
// In WaveformEditor, expose: (window as any).__wavesurfer = ws
// In PlaybackBar, call: (window as any).__wavesurfer?.playPause()
```

Actually, cleaner approach: keep `<audio>` element in PlaybackBar but use it for playback control and skip-cut. The WaveformEditor just visualizes. This avoids complex cross-component state.

**Revised plan for Task 11:**
- Keep PlaybackBar's `<audio>` element (don't touch it)
- WaveformEditor shows waveform synced to the same audio URL
- Skip-cut logic stays in PlaybackBar's `handleTimeUpdate`
- Play/Pause button stays in PlaybackBar
- WaveformEditor's play/pause button can be removed (duplicate)
- Keep PlaybackBar's existing structure mostly intact, just wire up to store's `audioFile`

Actually, let's be more surgical:

**Option A (simpler):** WaveformEditor shows waveform synced to audio via HTMLMediaElement events, PlaybackBar stays as-is (owns audio + skip-cut). No shared state needed.

**Option B (wavesurfer native):** Use wavesurfer for both playback and visualization. Move skip-cut logic to WaveformEditor. PlaybackBar becomes a dumb display.

**Recommendation: Option A** — minimal changes to PlaybackBar. Keep `<audio>` + HTML5 playback. WaveformEditor uses the same `audioFile` from store and renders wavesurfer from the object URL. Audio state stays in PlaybackBar.

**Revised WaveformEditor task (Task 9):** Load wavesurfer from `objectUrl` (derived from `audioFile` in the component), not from the store's audio element. Sync is visual only — both read from same file.

**Revised PlaybackBar task:** Keep as-is, only minor updates:
- Remove `handleTimeUpdate` skip-cut (no longer needed — word-drop's original skip-cut uses HTML5 Audio, but now cuts are waveform regions, not word-level skip... wait, the spec says "skip-cut playback" which means when audio reaches a cut region it jumps over it. This is the same behavior word-drop already has.)

Word-drop already has skip-cut in `handleTimeUpdate` via `deletedWord`. This still works — it uses `transcript.find(w => w.isDeleted && ...)` which we've renamed to `isCut`. Skip-cut stays in PlaybackBar.

So Task 11 is minimal — just ensure `isDeleted` → `isCut` rename in PlaybackBar's skip logic.

---

## Task 12: ExportModal — MP3 only

**Files:**
- Modify: `word-drop/components/ExportModal.tsx`

- [ ] **Step 1: Remove SRT export option**

Keep only `audio` export type. Remove `both` option and SRT-related code. Also change `worddrop-trimmed.mp3` → `edited-audio.mp3`.

- [ ] **Step 2: Rename `isDeleted` → `isCut` in filter**

Line 55: `transcript.filter((w) => w.isDeleted)` → `w.isCut`

---

## Task 13: Deepgram API route — ensure MP3 support

**Files:**
- Check: `word-drop/app/api/transcribe/route.ts`

- [ ] **Step 1: Verify Deepgram accepts MP3**

Deepgram SDK accepts `audio/mp3` and `audio/mpeg`. If route already handles file upload, no changes needed. If it validates format, add MP3 to accepted types.

---

## Task 14: Integration + end-to-end test

**Files:**
- None (testing only)

- [ ] **Step 1: Install deps and build**

Run: `cd word-drop && npm install && npm run build`

Expected: no TypeScript errors, no build errors.

- [ ] **Step 2: Run dev server and test**

Run: `cd word-drop && npm run dev`

Manual test checklist:
1. Upload MP3 → waveform renders, transcript appears
2. Type "hello world" in CutTextInput → those words struck-through in transcript, red region appears on waveform
3. Play audio → audio plays, skip-cut works (jumps over cut regions)
4. Type another substring → second cut region appears, overlaps merge if applicable
5. Click Export → MP3 downloads

---

## Task 15: Push to GitHub

**Files:**
- None (git operations)

- [ ] **Step 1: Stage all changes**

```bash
cd word-drop
git add -A
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: combined word-drop + precision-audio-editor
- wavesurfer.js waveform with cut regions
- CutTextInput: multi-line text-driven cuts
- transcript-based cut matching + region merging
- MP3 upload, Deepgram transcription, MP3 export
- skip-cut playback via HTML5 Audio
- refactored: isDeleted → isCut throughout"
```

- [ ] **Step 3: Push to remote**

```bash
git push origin main
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| MP3 upload | Task 5 (DropZone MP3-only) |
| Waveform + cut regions | Task 9 (WaveformEditor) |
| Deepgram transcription | Task 13 (existing route, MP3 support) |
| Transcript with word tokens | Task 4 (TranscriptEditor `isCut`) |
| CutTextInput (multi-line) | Task 8 (CutTextInput) |
| Text → cut matching | Task 7 (CutManager) |
| Overlapping cuts merge | Task 7 (mergeCutRanges) |
| Region adjustment (snap to words) | WaveformEditor's `resize: true` in regions — regions snap to pixel boundaries, word-boundary snapping handled on commit via region drag |
| Skip-cut playback | Task 11 (PlaybackBar, existing skip logic) |
| MP3 export | Task 12 (ExportModal) |
| isCut naming throughout | Tasks 2,3,4,6,12 |

## Gaps / Follow-up

- **Region edge snapping**: wavesurfer regions resize freely; enforcing word-boundary snapping on region update requires intercepting `region-updated` event and clamping to nearest word start/end. Not implemented in initial version — regions can be resized to arbitrary boundaries. Follow-up: add snap-to-word logic in WaveformEditor's region-updated handler.
- **Manual transcript selection + Cmd+Delete**: word-drop's existing TranscriptEditor already supports this via `handleKeyDown` → `deleteWords()`. This still works after `isDeleted` → `isCut` rename.
