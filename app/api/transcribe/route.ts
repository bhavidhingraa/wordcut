import { NextRequest, NextResponse } from "next/server";

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

  try {
    const buffer = Buffer.from(await audio.arrayBuffer());

    const response = await fetch(
      "https://api.deepgram.com/v1/listen?punctuate=true&smart_format=true&model=nova-3",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": audio.type,
        },
        body: buffer,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Deepgram API error:", response.status, errorText);
      return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
    }

    const data = await response.json();
    const words = data?.results?.channels?.[0]?.alternatives?.[0]?.words || [];

    return NextResponse.json({ words });
  } catch (e) {
    console.error("Deepgram error:", e);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
