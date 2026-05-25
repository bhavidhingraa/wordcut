import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Word {
  word: string;
  start: number;
  end: number;
  isCut: boolean;
}

export interface Selection {
  start: number;
  end: number;
}

interface AudioStore {
  audioFile: File | null;
  audioDataUrl: string | null; // runtime only, not persisted
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
  setAudioDataUrl: (url: string | null) => void;
  setTranscript: (words: Word[]) => void;
  clearTranscript: () => void;
  setPlayback: (playback: Partial<AudioStore["playback"]>) => void;
  setSelection: (selection: Selection | null) => void;
  addCut: (startIdx: number, endIdx: number) => void;
  removeCut: (index: number) => void;
  setIsRestoring: (val: boolean) => void;
}

export const useAudioStore = create<AudioStore>()(
  persist(
    (set) => ({
      audioFile: null,
      audioDataUrl: null,
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
      setAudioDataUrl: (url) => set({ audioDataUrl: url }),
      setTranscript: (words) => set({ transcript: words }),
      clearTranscript: () => set({ transcript: [], ui: { selection: null } }),
      setPlayback: (update) =>
        set((state) => ({ playback: { ...state.playback, ...update } })),
      setSelection: (selection) =>
        set((state) => ({ ui: { ...state.ui, selection } })),
      addCut: (startIdx, endIdx) =>
        set((state) => ({
          transcript: state.transcript.map((w, i) =>
            i >= startIdx && i <= endIdx ? { ...w, isCut: true } : w
          ),
          ui: { selection: null },
        })),
      removeCut: (index) =>
        set((state) => ({
          transcript: state.transcript.map((w, i) =>
            i === index ? { ...w, isCut: false } : w
          ),
        })),
      setIsRestoring: (val) => set({ isRestoring: val }),
    }),
    {
      name: "wordcut-session",
      partialize: (state) => ({
        transcript: state.transcript,
        ui: { selection: state.ui.selection },
      }),
    }
  )
);