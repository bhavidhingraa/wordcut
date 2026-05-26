import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Deepgram API key not configured" },
      { status: 500 }
    );
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "No audio URL provided" }, { status: 400 });
  }

  try {
    const response = await fetch(
      "https://api.deepgram.com/v1/listen?punctuate=true&smart_format=true&model=nova-3",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Deepgram API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Transcription failed" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const words = data?.results?.channels?.[0]?.alternatives?.[0]?.words || [];

    return NextResponse.json({ words });
  } catch (e) {
    console.error("Deepgram error:", e);
    return NextResponse.json(
      { error: "Transcription failed" },
      {  status: 500 }
    );
  }
}
