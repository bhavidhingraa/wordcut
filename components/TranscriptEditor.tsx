"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioStore } from "@/store/audioStore";
import WordToken from "./WordToken";

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function TranscriptEditor() {
  const { transcript, ui, setSelection, addCut, removeCut, playback } =
    useAudioStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const isMouseDown = useRef(false);
  const selectionStart = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = transcript.map((w) => w.word).join(" ");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [transcript]);

  const currentWordIndex = transcript.findIndex(
    (w) => w.start <= playback.currentTime && playback.currentTime < w.end && !w.isCut
  );
  const isCurrent = () => false; // disabled: no auto-scroll, no highlighting

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
          addCut(selection.start, selection.end);
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
  }, [ui.selection, transcript.length, addCut, setSelection]);

  const handleWordMouseDown = useCallback(
    (index: number, e: React.MouseEvent) => {
      isMouseDown.current = true;
      selectionStart.current = index;
      if (e.shiftKey && ui.selection) {
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

  const handleRestore = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      removeCut(index);
    },
    [removeCut]
  );

  const isSelected = (index: number) =>
    ui.selection ? index >= ui.selection.start && index <= ui.selection.end : false;

  if (transcript.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
        Upload an MP3 to see transcript
      </div>
    );
  }

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden"
    >
      <div className="flex-shrink-0 flex items-center justify-end px-4 pt-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors"
          style={{ color: copied ? "#22c55e" : "var(--text-muted)" }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span>{copied ? "Copied!" : "Copy transcript"}</span>
        </button>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 select-none"
        onMouseUp={handleWordMouseUp}
        onMouseLeave={handleWordMouseUp}
      >
        {transcript.map((word, index) => (
        <WordToken
          key={index}
          word={word.word}
          start={word.start}
          end={word.end}
          isCut={word.isCut}
          isSelected={isSelected(index)}
          isCurrent={isCurrent()}
          onClick={(e) => handleWordMouseDown(index, e)}
          onRestoreClick={(e) => handleRestore(index, e)}
          onMouseEnter={() => handleWordMouseEnter(index)}
        />
      ))}
      </div>
    </div>
  );
}
