import { v4 as uuidv4 } from 'uuid';
import { AudioSegment } from './types';

// Helper to format seconds into mm:ss.mmm
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

// Generate an active segment list with some defaults if empty
export function initializeSegments(): AudioSegment[] {
  return [];
}
