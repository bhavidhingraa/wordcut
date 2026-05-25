# Word Drop Audio Editor — Combined Design

## What We're Building

A precision audio editor combining word-drop's transcript-driven editing with precision-audio-editor's waveform visualization. Users upload MP3 → see waveform + transcript → cut text via input or keyboard → export MP3 without cuts.

## User Flow

1. User drops MP3 file → Deepgram transcription starts
2. Waveform renders below with cut regions (initially empty)
3. Transcript appears below waveform: word tokens with timestamps
4. User types substring in text box → clicks "Cut Text" OR selects transcript words + Cmd+Delete
5. Matching words get struck-through + greyed; cut region added to waveform
6. Overlapping cuts merge into single region
7. User can adjust region edges (snap to word boundaries)
8. Playback: audio head skips cut regions
9. Export → FFmpeg concatenates kept segments → downloads MP3

## Architecture

### Source of Truth
Transcript words array: `Array<{word: string, start: number, end: number, cut: boolean}>`

Cut regions derived from word array. Waveform regions computed on demand from word time ranges.

### Data Flow
```
Audio File
  ↓ Deepgram transcription
Word Array [{word, start, end, cut}]
  ↓ computeCutRegions()
Waveform Regions (visual only)
  ↓ sync
Transcript UI (struck-through + greyed)
  ↓ playback
Audio Engine (skip cut regions)
  ↓ export
FFmpeg → MP3
```

### Key Modules

**CutManager**
- `addCutByText(substring: string): void` — case-sensitive exact match, finds all word ranges, marks cut=true, merges overlapping
- `addCutBySelection(startIdx: number, endIdx: number): void` — marks words cut=true, merges
- `removeCut(startIdx: number, endIdx: number): void` — restore words
- `getCutRegions(): Region[]` — derived word time ranges for waveform
- `adjustCutRegion(id: string, newStart: number, newEnd: number): void` — snap to nearest word boundary

**AudioEngine**
- `play()` / `pause()` / `seek(time)`
- `skipToNextUncut()` — advances past cut regions during playback
- `getCurrentTime()`

**TranscriptionService**
- `transcribe(file: File): Promise<Word[]>`
- Wraps Deepgram API

**ExportService**
- `exportMp3(words: Word[], audioBlob: Blob): Promise<Blob>`
- FFmpeg WASM: collect kept segments → concatenate → encode MP3

## UI Layout

```
┌──────────────────────────────────────────────────┐
│  DropZone (drag MP3 here)                         │
├──────────────────────────────────────────────────┤
│  Waveform + Cut Regions (red overlays)            │
├──────────────────────────────────────────────────┤
│  [__________________ Cut Text Input __________][Cut]│
├──────────────────────────────────────────────────┤
│  Transcript: word tokens, struck-through = cut    │
│  playback bar: |◀ ▶|  0:00 / 3:24  [1.0x][Export]│
└──────────────────────────────────────────────────┘
```

## Behavior Rules

### Text Cutting
- Case-sensitive exact substring match (per line)
- Multi-line input: each line treated as independent substring; processed top-to-bottom, cuts accumulate
- All non-overlapping matches in transcript get cut
- Overlapping cuts merge into one region spanning all covered words
- Partial word matches NOT included ("dog" does not match "dogmatic")

### Region Adjustment
- Drag region edge → snaps to nearest word boundary (no partial-word cuts)
- Changes sync back to word array (region → word indices)

### Playback
- HTML5 Audio element
- `timeupdate` fires → check if within cut region → if so, skip to end of region
- Manual seek: clicking waveform sets `currentTime`

### Export
- MP3 only (no other formats)
- FFmpeg WASM: extract kept segments, concatenate, encode as MP3
- Downloads as `edited-audio.mp3`

## Tech Stack

- **Framework**: Next.js 15 (word-drop's version)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (keep existing word-drop styling)
- **Audio**: wavesurfer.js for waveform + regions, HTML5 Audio for playback
- **Transcription**: Deepgram SDK (`@deepgram/sdk`) — server-side API route
- **Processing**: `@ffmpeg/ffmpeg` 0.12 WASM (client-side)
- **State**: Zustand (from word-drop, persist to localStorage)

## Components

| Component | Purpose |
|-----------|---------|
| `DropZone` | MP3 file upload, validation |
| `WaveformEditor` | wavesurfer.js waveform + cut regions |
| `CutTextInput` | text box + Cut button |
| `TranscriptView` | word tokens, selection, strikethrough |
| `PlaybackBar` | play/pause/seek/speed controls |
| `ExportButton` | triggers FFmpeg export |

## Component Hierarchy

```
<AudioEditorPage>
  ├── DropZone
  ├── WaveformEditor        ← wavesurfer instance
  │   └── CutRegions        ← derived from CutManager
  ├── CutTextInput
  ├── TranscriptView        ← word tokens from transcript
  │   └── WordToken[]       ← individual word spans
  └── PlaybackBar
```

## Implementation Order

1. **Scaffold**: Use word-drop as base, add precision-audio-editor's wavesurfer setup
2. **Transcription pipeline**: Deepgram API route + word array state
3. **Waveform rendering**: wavesurfer.js with region support
4. **Cut matching engine**: text → word indices + merge logic
5. **Transcript UI**: word tokens, strikethrough, selection + Cmd+Delete
6. **Region sync**: waveform regions ↔ word array
7. **Playback engine**: audio + skip-cut logic
8. **Export**: FFmpeg MP3 concatenation
9. **Testing + polish**

## Open Questions

None — all resolved in brainstorming.

## Scope Boundaries

**In scope**: MP3 upload, Deepgram transcription, text-driven cuts (input + selection), waveform visualization, skip-cut playback, MP3 export.

**Out of scope**: Manual region drawing on waveform, non-MP3 export, Gemini AI integration, subtitle export, WAV/M4A/OGG import (MP3 only).
