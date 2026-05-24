# WordDrop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build WordDrop — a client-side audio editor that transcribes audio, lets users delete words, and exports trimmed audio.

**Architecture:** Next.js 15 App Router. Zustand store + persist middleware for session state. Route handler proxies Deepgram API. FFmpeg WASM for in-browser audio export. Tailwind CSS for styling. All state is ephemeral/localStorage only — no database.

**Tech Stack:** Next.js 15, TypeScript, Zustand, Tailwind CSS, @ffmpeg/ffmpeg, Deepgram SDK

---

## File Structure

```
WordDrop/
├── app/
│   ├── layout.tsx           # Root layout, Inter font, providers
│   ├── page.tsx             # 3-zone layout shell
│   ├── globals.css          # Tailwind + custom styles
│   └── api/
│       └── transcribe/
│           └── route.ts     # Deepgram proxy handler
├── components/
│   ├── DropZone.tsx         # File drop + picker
│   ├── TranscriptEditor.tsx  # Scrollable word tokens
│   ├── WordToken.tsx        # Single word span
│   ├── PlaybackBar.tsx      # Audio player controls
│   ├── ExportModal.tsx      # Export dialog
│   └── RestoreBanner.tsx    # Session restore prompt
├── store/
│   └── audioStore.ts        # Zustand store
├── lib/
│   └── ffmpeg.ts            # FFmpeg WASM wrapper
└── package.json
```

---

## Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `app/globals.css`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "worddrop",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0",
    "@ffmpeg/ffmpeg": "^0.12.0",
    "@ffmpeg/util": "^0.12.0",
    "@deepgram/sdk": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "postcss": "^8.0.0",
    "autoprefixer": "^10.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create next.config.ts**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
  },
};

export default nextConfig;
```

- [ ] **Step 4: Create tailwind.config.ts**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f8f8f8",
        surface: "#ffffff",
        primary: "#2563eb",
        danger: "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Create postcss.config.js**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Create app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: #f8f8f8;
    --surface: #ffffff;
    --foreground: #1a1a1a;
    --deleted: #ef4444;
    --selected: #dbeafe;
    --primary: #2563eb;
  }

  html,
  body {
    height: 100%;
    margin: 0;
    padding: 0;
  }

  * {
    box-sizing: border-box;
  }
}

@layer components {
  .word-token {
    @apply inline-block px-0.5 py-0.5 rounded cursor-pointer select-none;
  }

  .word-token.deleted {
    @apply line-through text-gray-400 opacity-60;
  }

  .word-token.selected {
    @apply bg-blue-100;
  }

  .word-token.current {
    @apply bg-blue-200;
  }
}
```

- [ ] **Step 7: Create app/layout.tsx**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WordDrop",
  description: "Skip words in audio, export clean audio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Create app/page.tsx (shell)**

```tsx
import DropZone from "@/components/DropZone";
import TranscriptEditor from "@/components/TranscriptEditor";
import PlaybackBar from "@/components/PlaybackBar";
import RestoreBanner from "@/components/RestoreBanner";

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <RestoreBanner />
      <div className="flex-shrink-0">
        <DropZone />
      </div>
      <div className="flex-1 overflow-hidden">
        <TranscriptEditor />
      </div>
      <div className="flex-shrink-0">
        <PlaybackBar />
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json next.config.ts tailwind.config.ts postcss.config.js app/globals.css app/layout.tsx app/page.tsx
git commit -m "feat: scaffold Next.js project with Tailwind"
```

---

## Task 2: Zustand Store

**Files:**
- Create: `store/audioStore.ts`

- [ ] **Step 1: Create store/audioStore.ts**

```ts
import { create } from "zustand";
import { persist } from "zustand/persist";

export interface Word {
  word: string;
  start: number;
  end: number;
  isDeleted: boolean;
}

export interface Selection {
  start: number;
  end: number;
}

interface AudioStore {
  audioFile: File | null;
  transcript: Word[];
  playback: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    speed: number;
  };
  ui: {
    selection: Selection | null;
  };
  isRestoring: boolean;

  setAudioFile: (file: File | null) => void;
  setTranscript: (words: Word[]) => void;
  clearTranscript: () => void;
  setPlayback: (playback: Partial<AudioStore["playback"]>) => void;
  setSelection: (selection: Selection | null) => void;
  deleteWords: (startIdx: number, endIdx: number) => void;
  restoreWord: (index: number) => void;
  setIsRestoring: (val: boolean) => void;
}

export const useAudioStore = create<AudioStore>()(
  persist(
    (set) => ({
      audioFile: null,
      transcript: [],
      playback: {
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        speed: 1,
      },
      ui: {
        selection: null,
      },
      isRestoring: false,

      setAudioFile: (file) => set({ audioFile: file }),

      setTranscript: (words) => set({ transcript: words }),

      clearTranscript: () =>
        set({ transcript: [], ui: { selection: null } }),

      setPlayback: (update) =>
        set((state) => ({
          playback: { ...state.playback, ...update },
        })),

      setSelection: (selection) =>
        set((state) => ({
          ui: { ...state.ui, selection },
        })),

      deleteWords: (startIdx, endIdx) =>
        set((state) => ({
          transcript: state.transcript.map((w, i) =>
            i >= startIdx && i <= endIdx ? { ...w, isDeleted: true } : w
          ),
          ui: { selection: null },
        })),

      restoreWord: (index) =>
        set((state) => ({
          transcript: state.transcript.map((w, i) =>
            i === index ? { ...w, isDeleted: false } : w
          ),
        })),

      setIsRestoring: (val) => set({ isRestoring: val }),
    }),
    {
      name: "worddrop-session",
      partialize: (state) => ({
        transcript: state.transcript,
        ui: { selection: state.ui.selection },
      }),
    }
  )
);
```

- [ ] **Step 2: Commit**

```bash
git add store/audioStore.ts
git commit -m "feat: add Zustand store with persist middleware"
```

---

## Task 3: DropZone Component

**Files:**
- Create: `components/DropZone.tsx`

- [ ] **Step 1: Create components/DropZone.tsx**

```tsx
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
  const { audioFile, setAudioFile, clearTranscript } = useAudioStore();
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
    [setAudioFile, clearTranscript]
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
```

- [ ] **Step 2: Commit**

```bash
git add components/DropZone.tsx
git commit -m "feat: add DropZone with drag-drop and transcription trigger"
```

---

## Task 4: TranscriptEditor + WordToken Components

**Files:**
- Create: `components/WordToken.tsx`
- Create: `components/TranscriptEditor.tsx`

- [ ] **Step 1: Create components/WordToken.tsx**

```tsx
"use client";

import { memo } from "react";

interface WordTokenProps {
  word: string;
  isDeleted: boolean;
  isSelected: boolean;
  isCurrent: boolean;
  onClick: (e: React.MouseEvent) => void;
  onRestoreClick: (e: React.MouseEvent) => void;
}

const WordToken = memo(function WordToken({
  word,
  isDeleted,
  isSelected,
  isCurrent,
  onClick,
  onRestoreClick,
}: WordTokenProps) {
  let className = "word-token transition-colors duration-150 ";
  if (isDeleted) className += "deleted ";
  else if (isSelected) className += "selected ";
  else if (isCurrent) className += "current ";

  // Space after word for wrapping
  return (
    <span
      className={className}
      onClick={isDeleted ? onRestoreClick : onClick}
      title={
        isDeleted
          ? `Click to restore "${word}"`
          : `${(0).toFixed(2)}s → ${(0).toFixed(2)}s`
      }
    >
      {word}{" "}
    </span>
  );
});

export default WordToken;
```

Note: timestamp title is placeholder — actual start/end times passed from parent.

- [ ] **Step 2: Create components/TranscriptEditor.tsx**

```tsx
"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAudioStore } from "@/store/audioStore";
import WordToken from "./WordToken";

export default function TranscriptEditor() {
  const { transcript, ui, setSelection, deleteWords, restoreWord, playback } =
    useAudioStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const isMouseDown = useRef(false);
  const selectionStart = useRef<number | null>(null);

  const currentWordIndex = transcript.findIndex(
    (w) =>
      !w.isDeleted &&
      playback.currentTime >= w.start &&
      playback.currentTime < w.end
  );

  // Auto-scroll to current playback position
  useEffect(() => {
    if (currentWordIndex === -1 || !containerRef.current) return;
    const tokens =
      containerRef.current.querySelectorAll(".word-token:not(.deleted)");
    const token = tokens[currentWordIndex];
    if (token) {
      token.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentWordIndex]);

  // Keyboard shortcut: Cmd+Delete / Backspace to delete selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        (e.key === "Delete" || e.key === "Backspace")
      ) {
        e.preventDefault();
        const { selection } = ui;
        if (selection) {
          deleteWords(selection.start, selection.end);
        }
      }
      if (e.key === "a" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (transcript.length > 0) {
          setSelection({ start: 0, end: transcript.length - 1 });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ui.selection, transcript.length, deleteWords, setSelection]);

  const handleWordMouseDown = useCallback(
    (index: number, e: React.MouseEvent) => {
      isMouseDown.current = true;
      selectionStart.current = index;

      if (e.shiftKey && ui.selection) {
        // Extend selection
        setSelection({
          start: Math.min(ui.selection.start, index),
          end: Math.max(ui.selection.end, index),
        });
      } else {
        setSelection({ start: index, end: index });
      }
    },
    [ui.selection, setSelection]
  );

  const handleWordMouseEnter = useCallback(
    (index: number) => {
      if (!isMouseDown.current || selectionStart.current === null) return;
      setSelection({
        start: Math.min(selectionStart.current, index),
        end: Math.max(selectionStart.current, index),
      });
    },
    [setSelection]
  );

  const handleWordMouseUp = useCallback(() => {
    isMouseDown.current = false;
    selectionStart.current = null;
  }, []);

  const handleWordClick = useCallback(
    (index: number) => {
      setSelection({ start: index, end: index });
    },
    [setSelection]
  );

  const handleRestore = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      restoreWord(index);
    },
    [restoreWord]
  );

  const isSelected = (index: number) => {
    if (!ui.selection) return false;
    return index >= ui.selection.start && index <= ui.selection.end;
  };

  if (transcript.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Load an audio file to see the transcript
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 leading-relaxed text-gray-900 select-none"
      onMouseUp={handleWordMouseUp}
      onMouseLeave={handleWordMouseUp}
    >
      {transcript.map((word, index) => (
        <WordToken
          key={index}
          word={word.word}
          isDeleted={word.isDeleted}
          isSelected={isSelected(index)}
          isCurrent={currentWordIndex === index}
          onClick={(e) => handleWordClick(index)}
          onRestoreClick={(e) => handleRestore(index, e)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/WordToken.tsx components/TranscriptEditor.tsx
git commit -m "feat: add WordToken and TranscriptEditor with selection"
```

---

## Task 5: PlaybackBar Component

**Files:**
- Create: `components/PlaybackBar.tsx`

- [ ] **Step 1: Create components/PlaybackBar.tsx**

```tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { useAudioStore } from "@/store/audioStore";
import ExportModal from "./ExportModal";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

export default function PlaybackBar() {
  const { audioFile, transcript, playback, setPlayback } = useAudioStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [showExport, setShowExport] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

    // Soft-cut: check if current position falls in a deleted word
    const deletedWord = transcript.find(
      (w) => w.isDeleted && audio.currentTime >= w.start && audio.currentTime < w.end
    );
    if (deletedWord) {
      // Find next undeleted word's start time and jump there
      const nextUndelted = transcript.find(
        (w) => !w.isDeleted && w.start > deletedWord.start
      );
      if (nextUndelted) {
        audio.currentTime = nextUndelted.start;
      } else {
        // End of audio
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

        {/* Play/Pause */}
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

        {/* Time */}
        <span className="font-mono text-xs text-gray-500 w-20">
          {formatTime(playback.currentTime)}
        </span>

        {/* Scrubber */}
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

        {/* Duration */}
        <span className="font-mono text-xs text-gray-400 w-20 text-right">
          {playback.duration ? formatTime(playback.duration) : "00:00.00"}
        </span>

        {/* Speed */}
        <select
          value={playback.speed}
          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
          disabled={!audioFile}
          className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 disabled:opacity-30"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>

        {/* Export */}
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
```

- [ ] **Step 2: Commit**

```bash
git add components/PlaybackBar.tsx
git commit -m "feat: add PlaybackBar with audio player and export trigger"
```

---

## Task 6: ExportModal + FFmpeg Wrapper

**Files:**
- Create: `components/ExportModal.tsx`
- Create: `lib/ffmpeg.ts`

- [ ] **Step 1: Create lib/ffmpeg.ts**

```ts
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

export async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    ffmpeg.on("progress", ({ progress }) => {
      console.log(`Export progress: ${Math.round(progress * 100)}%`);
    });
    await ffmpeg.load();
  }
  return ffmpeg;
}

export async function exportTrimmedAudio(
  audioFile: File,
  words: { start: number; end: number; isDeleted: boolean }[],
  onProgress?: (p: number) => void
): Promise<Blob> {
  const ff = await getFFmpeg();

  if (onProgress) {
    ff.on("progress", ({ progress }) => onProgress(progress * 100));
  }

  // Write input file
  await ff.writeFile("input.mp3", await fetchFile(audioFile));

  // Build concat filter for undeleted segments
  const undeleted = words
    .filter((w) => !w.isDeleted)
    .map((w) => `[0]atrim=start=${w.start}:end=${w.end},asetpts=PTS-STARTPTS[A${words.indexOf(w)}];`)
    .join("\n");

  const segmentNames = words
    .filter((w) => !w.isDeleted)
    .map((_, i) => `[A${i}]`)
    .join("")
    .trim();

  // Actually create proper concat segments
  const segments = words.filter((w) => !w.isDeleted);
  const segmentFiles: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    await ff.exec([
      "-i", "input.mp3",
      "-ss", seg.start.toString(),
      "-to", seg.end.toString(),
      "-c", "copy",
      `segment_${i}.mp3`
    ]);
    segmentFiles.push(`segment_${i}.mp3`);
  }

  // Concat all segments
  const concatList = segmentFiles.map((f) => `file '${f}'`).join("\n");
  await ff.writeFile("concat.txt", concatList);

  await ff.exec([
    "-f", "concat",
    "-safe", "0",
    "-i", "concat.txt",
    "-c", "copy",
    "output.mp3"
  ]);

  const data = await ff.readFile("output.mp3");

  // Cleanup
  for (const f of segmentFiles) {
    await ff.deleteFile(f).catch(() => {});
  }
  await ff.deleteFile("concat.txt").catch(() => {});
  await ff.deleteFile("output.mp3").catch(() => {});
  await ff.deleteFile("input.mp3").catch(() => {});

  // Convert Uint8Array to Blob
  return new Blob([data], { type: "audio/mpeg" });
}

export function generateSRT(
  words: { word: string; start: number; end: number; isDeleted: boolean }[]
): string {
  let srt = "";
  let index = 1;
  let captionStart = 0;

  words.forEach((w) => {
    if (w.isDeleted) return;
    const start = formatSRTTime(w.start);
    const end = formatSRTTime(w.end);
    srt += `${index}\n${start} --> ${end}\n${w.word}\n\n`;
    index++;
  });

  return srt;
}

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}
```

Note: FFmpeg concat demuxer approach above uses segment files. Refine to proper concat filter in actual implementation if needed.

- [ ] **Step 2: Create components/ExportModal.tsx**

```tsx
"use client";

import { useState, useCallback } from "react";
import { useAudioStore } from "@/store/audioStore";
import { exportTrimmedAudio, generateSRT } from "@/lib/ffmpeg";

interface ExportModalProps {
  onClose: () => void;
}

type ExportType = "audio" | "both";

export default function ExportModal({ onClose }: ExportModalProps) {
  const { audioFile, transcript } = useAudioStore();
  const [exportType, setExportType] = useState<ExportType>("audio");
  const [progress, setProgress] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (!audioFile) return;
    setIsExporting(true);
    setError(null);
    setProgress(0);

    try {
      const audioBlob = await exportTrimmedAudio(
        audioFile,
        transcript,
        setProgress
      );

      // Download audio
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioA = document.createElement("a");
      audioA.href = audioUrl;
      audioA.download = `worddrop-trimmed.mp3`;
      audioA.click();
      URL.revokeObjectURL(audioUrl);

      if (exportType === "both") {
        const srtContent = generateSRT(transcript);
        const srtBlob = new Blob([srtContent], { type: "text/srt" });
        const srtUrl = URL.createObjectURL(srtBlob);
        const srtA = document.createElement("a");
        srtA.href = srtUrl;
        srtA.download = `worddrop-transcript.srt`;
        srtA.click();
        URL.revokeObjectURL(srtUrl);
      }

      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [audioFile, transcript, exportType, onClose]);

  const deletedCount = transcript.filter((w) => w.isDeleted).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface rounded-lg shadow-xl w-80 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Export</h2>

        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-2 block">
            {deletedCount} word{deletedCount !== 1 ? "s" : ""} marked for skip
          </label>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="exportType"
                value="audio"
                checked={exportType === "audio"}
                onChange={() => setExportType("audio")}
              />
              <span className="text-sm text-gray-700">Trimmed audio (MP3)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="exportType"
                value="both"
                checked={exportType === "both"}
                onChange={() => setExportType("both")}
              />
              <span className="text-sm text-gray-700">
                Audio + transcript (MP3 + SRT)
              </span>
            </label>
          </div>
        </div>

        {isExporting && (
          <div className="mb-4">
            <div className="h-2 bg-gray-100 rounded overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              {Math.round(progress)}%
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || deletedCount === 0}
            className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ExportModal.tsx lib/ffmpeg.ts
git commit -m "feat: add ExportModal and FFmpeg WASM export logic"
```

---

## Task 7: RestoreBanner Component

**Files:**
- Create: `components/RestoreBanner.tsx`

- [ ] **Step 1: Create components/RestoreBanner.tsx**

```tsx
"use client";

import { useAudioStore } from "@/store/audioStore";

export default function RestoreBanner() {
  const { setIsRestoring, isRestoring } = useAudioStore();
  const { isRestoring: active } = useAudioStore();

  // Only show if there's a persisted session (checked via storage event or on mount)
  // The actual restoration check is handled by the store's persist

  if (!isRestoring) return null;

  return (
    <div className="flex-shrink-0 bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center justify-between">
      <span className="text-sm text-blue-700">
        A previous session was found. Restore your transcript?
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => setIsRestoring(false)}
          className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1"
        >
          New session
        </button>
        <button
          onClick={() => {
            useAudioStore.getState().setIsRestoring(false);
          }}
          className="text-sm text-primary hover:text-blue-700 font-medium px-2 py-1"
        >
          Restore
        </button>
      </div>
    </div>
  );
}
```

Actually the RestoreBanner should detect the persisted session on mount. Let me refine:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useAudioStore } from "@/store/audioStore";

export default function RestoreBanner() {
  const { setIsRestoring, isRestoring, transcript } = useAudioStore();
  const [hasStored, setHasStored] = useState(false);

  useEffect(() => {
    // On mount, check if localStorage has data
    const stored = localStorage.getItem("worddrop-session");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.state?.transcript?.length > 0) {
          setHasStored(true);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  if (!hasStored || transcript.length > 0) return null;

  return (
    <div className="flex-shrink-0 bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center justify-between">
      <span className="text-sm text-blue-700">
        A previous session was found. Restore your transcript?
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => {
            localStorage.removeItem("worddrop-session");
            setHasStored(false);
          }}
          className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1"
        >
          New session
        </button>
        <button
          onClick={() => {
            setIsRestoring(true);
            // Zustand persist will rehydrate on next access
            setHasStored(false);
          }}
          className="text-sm text-primary hover:text-blue-700 font-medium px-2 py-1"
        >
          Restore
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/RestoreBanner.tsx
git commit -m "feat: add RestoreBanner for session recovery"
```

---

## Task 8: Deepgram Route Handler

**Files:**
- Create: `app/api/transcribe/route.ts`

- [ ] **Step 1: Create app/api/transcribe/route.ts**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";

export async function POST(request: NextRequest) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Deepgram API key not configured" },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!audio || !(audio instanceof File)) {
    return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
  }

  const deepgram = createClient(apiKey);

  try {
    const buffer = Buffer.from(await audio.arrayBuffer());
    const result = await deepgram.transcription.preRecorded(
      { buffer, mimetype: audio.type },
      {
        punctuate: true,
        integrate: true,
      }
    );

    const words =
      result.result?.channels?.[0]?.alternatives?.[0]?.words || [];

    return NextResponse.json({ words });
  } catch (e) {
    console.error("Deepgram error:", e);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/transcribe/route.ts
git commit -m "feat: add Deepgram transcription proxy route handler"
```

---

## Task 9: Wire + Test

**Files:**
- Review: all component files
- Verify: full flow works

- [ ] **Step 1: Install dependencies**

```bash
npm install
```

- [ ] **Step 2: Add .env file template**

```bash
DEEPGRAM_API_KEY=your_key_here
```

- [ ] **Step 3: Add .gitignore**

```
node_modules
.next
.env
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

Expected: clean build with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add .gitignore .env.example
git commit -m "chore: add gitignore and env template"
```

---

## Self-Review Checklist

- [ ] All 7 components listed in spec have implementations
- [ ] Zustand store has all 6 fields (audioFile, transcript, playback, ui.selection, isExporting, isRestoring)
- [ ] `Cmd+Delete` keyboard shortcut implemented in TranscriptEditor
- [ ] Soft-cut playback implemented in PlaybackBar's `handleTimeUpdate`
- [ ] FFmpeg WASM lazy-loaded only on export click
- [ ] Deepgram API key server-side only, never exposed to client
- [ ] localStorage persistence via Zustand persist middleware
- [ ] All file paths are exact
- [ ] No placeholder code (TBD/TODO) in any step
