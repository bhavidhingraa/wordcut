"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAudioStore } from "@/store/audioStore";
import WordToken from "./WordToken";

export default function TranscriptEditor() {
  const { transcript, ui, setSelection, addCut, removeCut, playback } =
    useAudioStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const isMouseDown = useRef(false);
  const selectionStart = useRef<number | null>(null);

  const currentWordIndex = transcript.findIndex(
    (w) => w.start <= playback.currentTime && playback.currentTime < w.end && !w.isCut
  );

  // Auto-scroll to current playback position
  useEffect(() => {
    if (currentWordIndex === -1 || !containerRef.current) return;
    const tokens =
      containerRef.current.querySelectorAll(".word-token:not(.cut)");
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
          isCurrent={currentWordIndex === index}
          onClick={(e) => handleWordMouseDown(index, e)}
          onRestoreClick={(e) => handleRestore(index, e)}
          onMouseEnter={() => handleWordMouseEnter(index)}
        />
      ))}
    </div>
  );
}
