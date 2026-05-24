# WordDrop — Audio Text Skip

**Date:** 2026-05-25
**Status:** Draft

## 1. Concept & Vision

WordDrop is a client-side audio editing tool that transcribes audio, lets users mark words to skip, and exports a trimmed audio file with those sections removed. Everything runs in-browser — no database, no accounts, no cloud state. Sessions are ephemeral but auto-saved to localStorage. The feel is fast, private, and tool-like — a precision instrument, not a subscription SaaS.

---

## 2. Design Language

- **Aesthetic:** Neutral productivity tool. Crisp, light, functional. Think iA Writer meets Descript — no visual clutter.
- **Color palette:**
  - Background: `#f8f8f8` (light gray)
  - Surface: `#ffffff`
  - Text: `#1a1a1a`
  - Accent (deletion): `#ef4444` (red-500)
  - Deleted text: strikethrough, `#a1a1a1`
  - Selected highlight: `#dbeafe` (blue-100)
  - Focus/active: `#2563eb` (blue-600)
- **Typography:** `Inter` for UI, `JetBrains Mono` for timestamps
- **Spatial system:** 3-zone layout — top (DropZone), middle (TranscriptEditor, flex-grow scrollable), bottom (PlaybackBar, fixed)
- **Motion:** Minimal. Selection highlight fades (150ms). Soft-cut transitions on playback. No decorative animation.

---

## 3. Layout & Structure

```
┌─────────────────────────────────────────┐
│  DropZone: file input + drag zone        │  (fixed height ~120px)
├─────────────────────────────────────────┤
│                                         │
│  TranscriptEditor: scrollable word       │  (flex-grow)
│  tokens, selectable, strikethrough       │
│                                         │
├─────────────────────────────────────────┤
│  PlaybackBar: audio player controls     │  (fixed height ~80px)
└─────────────────────────────────────────┘
```

- ExportModal: overlay dialog triggered from PlaybackBar
- Responsive: stacks gracefully on mobile (transcript text-wrap)

---

## 4. Features & Interactions

### File Input
- Drag-and-drop zone + file picker button
- Accepts: `audio/wav`, `audio/mp3`, `audio/mpeg`, `audio/m4a`, `audio/ogg`, `audio/webm`
- On file select: store `File` in Zustand, display filename, auto-trigger transcription
- Rejected files: show inline error (unsupported format)

### Transcription
- `POST /api/transcribe` with `FormData` (audio file)
- Deepgram returns word-level timestamps: `{ word, start, end }`
- Loading state: spinner in TranscriptEditor + "Transcribing..." label
- Error state: inline error message + retry button

### Transcript Editor
- Words rendered as inline tokens separated by spaces
- Click word: single-word selection (highlighted blue)
- Click + drag: range selection across multiple words
- `Cmd+A`: select all words
- `Cmd+Delete` / `Backspace`: mark selected words `isDeleted: true` (strikethrough red, dimmed)
- Click deleted word: undo (mark `isDeleted: false`)
- Scrollable; auto-scrolls to keep current playback position visible

### Playback
- `<audio>` element with custom controls
- Plays from currentTime; skipped words are soft-cut (10ms fade-out, jump, 10ms fade-in)
- `timeupdate` event → highlight current word in transcript (auto-scroll into view)
- Playback speed: 0.75x, 1x, 1.25x, 1.5x, 2x
- Time display: `MM:SS.ms` in mono font

### Session Persistence
- Zustand `persist` middleware saves to localStorage on every transcript edit
- Key: `worddrop-session`
- On load: if transcript exists in localStorage, offer "Restore session" button
- If audio file missing on restore: show notice + re-drop zone
- All transcript state (word timings + deletion status) survives refresh

### Export
- `ExportModal` dialog with two options:
  - **Trimmed audio only** — MP3, deleted sections removed
  - **Audio + transcript** — MP3 + SRT file with timestamps preserved
- Uses `@ffmpeg/ffmpeg` (WASM) — loaded lazily on first export click
- Export progress bar (ffmpeg reports progress %)
- On complete: auto-download triggered

### Environment
- `DEEPGRAM_API_KEY` — stored server-side only; never exposed to client
- Build-time: `NEXT_PUBLIC_APP_NAME=WordDrop`

---

## 5. Component Inventory

| Component | Description |
|-----------|-------------|
| `DropZone` | Accepts file drop or picker input. Shows file name + size when loaded. |
| `TranscriptEditor` | Scrollable div of `<WordToken>` spans. Manages selection state. |
| `WordToken` | Single word span. States: default, selected, deleted. |
| `PlaybackBar` | Audio element, play/pause, scrub, speed selector, time display, Export button. |
| `ExportModal` | Dialog. Format picker, export button, progress bar, download links. |
| `RestoreBanner` | Shown on load if localStorage session found. "Restore" or "New session". |

---

## 6. Technical Approach

### Framework & Libraries
- **Next.js 15** (App Router, TypeScript)
- **Zustand** (state + persist middleware)
- **Tailwind CSS** (styling)
- **@ffmpeg/ffmpeg** (WASM audio processing, lazy-loaded)
- **Deepgram SDK** (server-side transcription)

### State Shape (Zustand)
```ts
interface AudioStore {
  audioFile: File | null;
  transcript: Word[];
  playback: { isPlaying: boolean; currentTime: number; duration: number };
  ui: { selection: { start: number; end: number } | null; isExporting: boolean };
  persist: { tracks: Word[]; selection: ... } // via zustand/persist
}

interface Word {
  word: string;
  start: number; // seconds
  end: number;
  isDeleted: boolean;
}
```

### API Routes
- `POST /api/transcribe` — receives FormData audio, streams to Deepgram, returns word array
  - Request: `FormData { audio: File }`
  - Response: `{ words: [{ word: string; start: number; end: number }] }`
  - Errors: 400 (no file), 500 (Deepgram error)

### Audio Processing (Export)
- Load ffmpeg WASM lazily on first export invocation
- Build ffmpeg concat filter to slice out deleted word ranges
- Encode to MP3 at 128kbps
- Trigger download via `URL.createObjectURL`

### File Structure
```
WordDrop/
├── app/
│   ├── layout.tsx
│   ├── page.tsx            # 3-zone layout shell
│   ├── globals.css
│   └── api/
│       └── transcribe/
│           └── route.ts    # Deepgram proxy
├── components/
│   ├── DropZone.tsx
│   ├── TranscriptEditor.tsx
│   ├── WordToken.tsx
│   ├── PlaybackBar.tsx
│   ├── ExportModal.tsx
│   └── RestoreBanner.tsx
├── store/
│   └── audioStore.ts       # Zustand store
├── lib/
│   └── ffmpeg.ts          # ffmpeg.wasm wrapper
├── docs/superpowers/specs/ # design docs
└── package.json
```

---

## 7. Verification

- File drop → transcript loads (words visible, timestamps correct)
- Select text → highlight applied (blue background)
- Cmd+Delete → strike-through red, text dimmed
- Play audio → current word highlights, autoscrolls
- Hit deleted word → undo (strikethrough removed)
- Refresh page → RestoreBanner appears, click Restore → transcript reappears
- Export trimmed audio → valid MP3 downloads, deleted sections absent
- Export audio + SRT → both files download, SRT timestamps match undeleted words
