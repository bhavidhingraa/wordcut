import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

export interface Cut {
  timestamp?: string;
  startTime: number;
  endTime: number;
  original: string;
  suggestedCut: string;
  reason: string;
}

let ffmpeg: FFmpeg | null = null;

export async function loadFFmpeg(
  onProgress?: (progress: number) => void
): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  ffmpeg.on("progress", ({ progress }) => {
    onProgress?.(progress * 100);
  });

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
}

export async function processAudio(
  audioData: Uint8Array,
  cuts: Cut[],
  onProgress?: (progress: number) => void
): Promise<Blob> {
  console.log("[processAudio] audioData length:", audioData.length);
  console.log("[processAudio] cuts:", JSON.stringify(cuts));

  const ff = await loadFFmpeg(onProgress);

  // Detect format from magic bytes
  const isMP3 = audioData[0] === 0xFF && (audioData[1] & 0xE0) === 0xE0;
  const isOGG = audioData[0] === 0x4F && audioData[1] === 0x67 && audioData[2] === 0x67;
  const isWAV = audioData[0] === 0x52 && audioData[1] === 0x49 && audioData[2] === 0x46 && audioData[3] === 0x46;
  const inputExt = isMP3 ? "mp3" : isOGG ? "ogg" : isWAV ? "wav" : "m4a";

  const inputName = `input.${inputExt}`;
  const outputName = "output.mp3";

  await ff.writeFile(inputName, audioData);
  console.log("[processAudio] wrote input file as", inputName);

  const sortedCuts = [...cuts].sort((a, b) => a.startTime - b.startTime);
  console.log("[processAudio] sorted cuts:", sortedCuts);

  const keepSegments: string[] = [];
  let cursor = 0;

  for (const cut of sortedCuts) {
    console.log(`[processAudio] cut: cursor=${cursor}, start=${cut.startTime}, end=${cut.endTime}`);
    if (cursor < cut.startTime) {
      const segName = `keep_${keepSegments.length}.mp3`;
      console.log(`[processAudio] extracting keep segment: ${segName} from ${cursor} to ${cut.startTime}`);
      await ff.exec([
        "-i", inputName,
        "-ss", cursor.toString(),
        "-to", cut.startTime.toString(),
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
    console.log(`[processAudio] extracting final segment: ${segName} from ${cursor} to end`);
    await ff.exec([
      "-i", inputName,
      "-ss", cursor.toString(),
      "-c:a", "libmp3lame",
      "-q:a", "2",
      segName
    ]);
    keepSegments.push(segName);
  }

  console.log("[processAudio] keepSegments count:", keepSegments.length);

  if (keepSegments.length === 0) {
    console.log("[processAudio] no segments extracted, returning original");
    const data = await ff.readFile(inputName);
    const uint8 = new Uint8Array(data as Uint8Array);
    return new Blob([uint8.buffer as ArrayBuffer], { type: "audio/mpeg" });
  }

  const concatList = keepSegments.map((_, i) => `file 'keep_${i}.mp3'`).join("\n");
  console.log("[processAudio] concat list:", concatList);
  await ff.writeFile("concat.txt", concatList);

  console.log("[processAudio] running concat...");
  await ff.exec([
    "-f", "concat",
    "-safe", "0",
    "-i", "concat.txt",
    "-c:a", "libmp3lame",
    "-q:a", "2",
    outputName
  ]);

  const data = await ff.readFile(outputName);
  const uint8Out = new Uint8Array(data as Uint8Array);
  console.log("[processAudio] output size:", uint8Out.length);

  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);
  for (const seg of keepSegments) {
    await ff.deleteFile(seg);
  }
  await ff.deleteFile("concat.txt");

  return new Blob([uint8Out.buffer as ArrayBuffer], { type: "audio/mpeg" });
}