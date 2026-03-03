import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PitchMirror",
  description: "Get clear, actionable coaching feedback on your pitch video.",
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

