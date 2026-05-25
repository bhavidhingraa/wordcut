import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WordCut — Edit audio by typing",
  description: "Upload audio, type words to cut, export clean MP3.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
