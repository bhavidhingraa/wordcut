"use client";

import { useState, useCallback } from "react";
import { useAudioStore } from "@/store/audioStore";
import { processMultiLineCut } from "@/lib/cutManager";

export default function CutTextInput() {
  const [text, setText] = useState("");
  const { transcript, addCut } = useAudioStore();

  const handleCut = useCallback(() => {
    if (!text.trim() || transcript.length === 0) return;

    const ranges = processMultiLineCut(transcript, text);
    for (const [startIdx, endIdx] of ranges) {
      addCut(startIdx, endIdx);
    }
    setText("");
  }, [text, transcript, addCut]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleCut();
      }
    },
    [handleCut]
  );

  if (transcript.length === 0) return null;

  const cutCount = transcript.filter((w) => w.isCut).length;

  return (
    <div
      style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type text to cut — one phrase per line, case-sensitive…"
              rows={2}
              className="input-area text-sm"
            />
          </div>
          <button
            onClick={handleCut}
            disabled={!text.trim() || transcript.length === 0}
            className="btn-primary text-sm flex-shrink-0"
          >
            Cut Text
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Cmd+Enter to cut &nbsp;·&nbsp; Each line = independent phrase &nbsp;·&nbsp; Case-sensitive exact match
          </p>
          {cutCount > 0 && (
            <p className="text-xs mono" style={{ color: "var(--cut-border)" }}>
              {cutCount} word{cutCount !== 1 ? "s" : ""} cut
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
