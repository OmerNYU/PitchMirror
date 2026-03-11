import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, Figtree } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const figtree = Figtree({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="en" className={cn(display.variable, "font-sans", figtree.variable)}>
      <body className="font-[family-name:var(--font-sans)]">
        {children}
      </body>
    </html>
  );
}

