import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PitchMirror 2.0",
  description: "AI-powered presentation coaching for judges demo",
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

