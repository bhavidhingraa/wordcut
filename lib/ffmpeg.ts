import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let ffmpegLoading: Promise<FFmpeg> | null = null;

export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  if (ffmpegLoading) return ffmpegLoading;
  ffmpegLoading = (async () => {
    const ff = new FFmpeg();
    ff.on("log", ({ message }) => console.log("[ffmpeg]", message));
    try {
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ff.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
    } catch (e) {
      ffmpeg = null;
      ffmpegLoading = null;
      throw e;
    }
    ffmpeg = ff;
    return ff;
  })();
  return ffmpegLoading;
}

export async function exportTrimmedAudio(
  audioFile: File,
  regions: { startTime: number; endTime: number }[],
  onProgress?: (p: number) => void
): Promise<Blob> {
  const ff = await getFFmpeg();

  if (onProgress) {
    ff.on("progress", ({ progress }) => onProgress(progress * 100));
  }

  try {
    await ff.writeFile("input.mp3", new Uint8Array(await audioFile.arrayBuffer()));
  } catch (e) {
    console.error("[ffmpeg] writeFile input.mp3 failed:", e);
    throw e;
  }

  const sortedCuts = [...regions].sort((a, b) => a.startTime - b.startTime);
  const keepSegments: string[] = [];
  let cursor = 0;

  for (const cut of sortedCuts) {
    if (cursor < cut.startTime) {
      const segName = `keep_${keepSegments.length}.mp3`;
      const duration = cut.startTime - cursor;
      await ff.exec([
        "-i", "input.mp3",
        "-ss", cursor.toString(),
        "-t", duration.toString(),
        "-c:a", "libmp3lame",
        "-q:a", "2",
        segName
      ]);
      keepSegments.push(segName);
    }
    cursor = cut.endTime;
  }

  if (cursor > 0) {
    const segName = `keep_${keepSegments.length}.mp3`;
    await ff.exec([
      "-i", "input.mp3",
      "-ss", cursor.toString(),
      "-c:a", "libmp3lame",
      "-q:a", "2",
      segName
    ]);
    keepSegments.push(segName);
  }

  if (keepSegments.length === 0) {
    const data = await ff.readFile("input.mp3");
    const uint8Out = new Uint8Array(data as Uint8Array);
    await ff.deleteFile("input.mp3").catch(() => {});
    return new Blob([uint8Out.buffer], { type: "audio/mpeg" });
  }

  const concatList = keepSegments.map((_, i) => `file 'keep_${i}.mp3'`).join("\n");
  try {
    await ff.writeFile("concat.txt", concatList);
  } catch (e) {
    console.error("[ffmpeg] writeFile concat.txt failed:", e);
    throw e;
  }

  try {
    await ff.exec([
      "-f", "concat",
      "-safe", "0",
      "-i", "concat.txt",
      "-c:a", "libmp3lame",
      "-q:a", "2",
      "output.mp3",
    ]);
  } catch (e) {
    console.error("[ffmpeg] concat failed:", e);
    throw e;
  }

  const data = await ff.readFile("output.mp3");
  const uint8Out = new Uint8Array(data as Uint8Array);
  console.log("[exportTrimmedAudio] output size:", uint8Out.length);

  await ff.deleteFile("input.mp3").catch(() => {});
  await ff.deleteFile("output.mp3").catch(() => {});
  for (const seg of keepSegments) {
    await ff.deleteFile(seg).catch(() => {});
  }
  await ff.deleteFile("concat.txt").catch(() => {});

  return new Blob([uint8Out.buffer], { type: "audio/mpeg" });
}

export function generateSRT(
  words: { word: string; start: number; end: number; isCut: boolean }[]
): string {
  let srt = "";
  let index = 1;

  words.forEach((w) => {
    if (w.isCut) return;
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
