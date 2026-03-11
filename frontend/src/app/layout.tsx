import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
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
  const path = headers().get("x-pathname") ?? "/";
  const onStudio = path.startsWith("/studio");

  return (
    <html lang="en" className={cn(display.variable, "font-sans", figtree.variable)}>
      <body className="font-[family-name:var(--font-sans)]">
        <header className="sticky top-0 z-20 border-b border-[color:var(--pm-border-subtle)]/30 bg-[color:var(--pm-bg)]/85 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-8">
            <Link
              href="/"
              className="text-xs font-semibold uppercase tracking-[0.26em] text-[color:var(--pm-text-muted)]"
            >
              PitchMirror
            </Link>
            <nav className="flex items-center gap-2 text-xs">
              {onStudio ? (
                <Link
                  href="/"
                  className="rounded-full border border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface-soft)] px-3 py-1 text-[11px] text-[color:var(--pm-text-muted)] hover:bg-[color:var(--pm-surface)]"
                >
                  Back to overview
                </Link>
              ) : (
                <Link
                  href="/studio"
                  className="rounded-full bg-[color:var(--pm-accent)] px-4 py-1.5 text-[11px] font-medium text-slate-950 shadow-[0_14px_35px_rgba(15,23,42,0.45)] hover:bg-[color:var(--pm-accent)]/90"
                >
                  Open Studio
                </Link>
              )}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

