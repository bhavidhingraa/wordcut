import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

export async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
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

  await ff.writeFile("input.mp3", await fetchFile(audioFile));

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

  for (const f of segmentFiles) {
    await ff.deleteFile(f).catch(() => {});
  }
  await ff.deleteFile("concat.txt").catch(() => {});
  await ff.deleteFile("output.mp3").catch(() => {});
  await ff.deleteFile("input.mp3").catch(() => {});

  return new Blob([data as unknown as BlobPart], { type: "audio/mpeg" });
}

export function generateSRT(
  words: { word: string; start: number; end: number; isDeleted: boolean }[]
): string {
  let srt = "";
  let index = 1;

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