import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Precision Audio Editor",
  description: "AI-powered audio trimmer",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}