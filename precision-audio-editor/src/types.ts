export interface AudioSegment {
  id: string;              // Unique identifier (UUIDv4)
  startTime: number;       // Start timestamp in seconds (e.g., 12.354)
  endTime: number;         // End timestamp in seconds (e.g., 15.892)
  label: string;           // Display text shown on hover tooltip
  transcript?: string;     // Dummy transcript shown on hover
  isLocked?: boolean;      // Fallback flag to prevent modification
}

export interface TimelineState {
  audioUrl: string | null; // Source audio reference
  isPlaying: boolean;      // Playback engine toggle state
  currentTime: number;     // Absolute position of the playhead (seconds)
  zoomLevel: number;       // Pixels-per-second multiplier value
  segments: AudioSegment[];// Array containing active red ranges
  isReady: boolean;        // Audio is successfully loaded and ready
}
