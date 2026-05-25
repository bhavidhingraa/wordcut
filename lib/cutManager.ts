import type { Word } from "@/store/audioStore";

export interface CutRegion {
  startTime: number;
  endTime: number;
}

/**
 * Given a transcript and a substring, find all matching word index ranges.
 * Case-sensitive exact match. Returns [startIdx, endIdx] pairs.
 */
export function findMatchingWordRanges(
  transcript: Word[],
  substring: string
): Array<[number, number]> {
  const results: Array<[number, number]> = [];

  // Build cumulative character positions for each word
  const wordStarts: number[] = [];
  const wordEnds: number[] = [];
  let pos = 0;

  for (let i = 0; i < transcript.length; i++) {
    wordStarts.push(pos);
    wordEnds.push(pos + transcript[i].word.length);
    pos += transcript[i].word.length + 1; // +1 for space separator
  }

  // Build full text
  const text = transcript.map((w) => w.word).join(" ");

  let searchFrom = 0;
  while (true) {
    const charIdx = text.indexOf(substring, searchFrom);
    if (charIdx === -1) break;

    // Find word indices that this match covers
    let startWord = -1;
    let endWord = -1;

    for (let i = 0; i < transcript.length; i++) {
      const wStart = wordStarts[i];
      const wEnd = wordEnds[i];
      if (charIdx >= wStart && charIdx < wEnd) startWord = i;
      if (charIdx + substring.length > wStart && charIdx + substring.length <= wEnd) {
        endWord = i;
        break;
      }
    }

    if (startWord !== -1 && endWord !== -1) {
      results.push([startWord, endWord]);
    }

    searchFrom = charIdx + 1;
  }

  return results;
}

/**
 * Merge overlapping or adjacent cut ranges into non-overlapping regions.
 * Ranges are [startIdx, endIdx] word indices.
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
 * Convert word index ranges to time-based cut regions.
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
 * Process multi-line text: each line is an independent substring.
 * Returns merged word index ranges.
 */
export function processMultiLineCut(
  transcript: Word[],
  multiLineText: string
): Array<[number, number]> {
  const lines = multiLineText.split("\n").filter((l) => l.trim().length > 0);
  const allRanges: Array<[number, number]> = [];

  for (const line of lines) {
    const matches = findMatchingWordRanges(transcript, line.trim());
    allRanges.push(...matches);
  }

  return mergeCutRanges(allRanges);
}

/**
 * Compute cut regions from the current transcript word array.
 * Groups consecutive isCut=true words into time regions.
 */
export function computeCutRegionsFromTranscript(
  transcript: Word[]
): CutRegion[] {
  const regions: CutRegion[] = [];
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
      regions.push({ startTime: start, endTime: end });
      i = j;
    } else {
      i++;
    }
  }

  return regions;
}

/**
 * Snap a time to the nearest word boundary in the transcript.
 */
export function snapToWordBoundary(
  time: number,
  transcript: Word[],
  prefer: "before" | "after" = "before"
): number {
  for (let i = 0; i < transcript.length; i++) {
    if (Math.abs(transcript[i].start - time) < 0.01) return transcript[i].start;
    if (Math.abs(transcript[i].end - time) < 0.01) return transcript[i].end;
    if (transcript[i].start > time) {
      if (prefer === "before" && i > 0) return transcript[i - 1].end;
      return transcript[i].start;
    }
  }
  return transcript[transcript.length - 1].end;
}
