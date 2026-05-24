import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";

export async function POST(request: NextRequest) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Deepgram API key not configured" },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!audio || !(audio instanceof File)) {
    return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
  }

  const deepgram = createClient(apiKey);

  try {
    const buffer = Buffer.from(await audio.arrayBuffer());
    const result = await deepgram.transcription.preRecorded(
      { buffer, mimetype: audio.type },
      { punctuate: true, integrate: true }
    );

    const words =
      result.result?.channels?.[0]?.alternatives?.[0]?.words || [];

    return NextResponse.json({ words });
  } catch (e) {
    console.error("Deepgram error:", e);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}