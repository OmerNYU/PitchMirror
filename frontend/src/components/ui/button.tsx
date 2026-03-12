"use client";

import { cloneElement, isValidElement } from "react";
import { motion } from "framer-motion";
import type React from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "sm";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-full border text-sm font-medium tracking-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--pm-accent)] focus-visible:ring-offset-[color:var(--pm-bg)] disabled:cursor-not-allowed disabled:opacity-50";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[color:var(--pm-accent)] text-slate-950 border-transparent hover:bg-[color:var(--pm-accent)]/90",
  secondary:
    "bg-[color:var(--pm-surface-soft)] text-[color:var(--pm-text-main)] border-[color:var(--pm-border-subtle)] hover:bg-[color:var(--pm-surface)]",
  ghost:
    "bg-transparent text-[color:var(--pm-text-muted)] border-transparent hover:bg-[color:var(--pm-surface-soft)]/70",
};

const sizeClasses: Record<Size, string> = {
  md: "min-h-[44px] px-5 py-2.5",
  sm: "min-h-[36px] px-3 py-1.5 text-xs",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  disabled,
  children,
  asChild = false,
  ...props
}: ButtonProps) {
  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (asChild && isValidElement(children)) {
    return cloneElement(children as React.ReactElement<{ className?: string }>, {
      className: [classes, (children.props as { className?: string }).className]
        .filter(Boolean)
        .join(" "),
    });
  }

  const isInteractive = !disabled;

  return (
    <motion.button
      type={props.type ?? "button"}
      className={classes}
      disabled={disabled}
      whileHover={
        isInteractive
          ? {
              y: -1,
              boxShadow:
                "0 18px 40px rgba(15,23,42,0.55), 0 0 0 1px rgba(148,163,184,0.15)",
              transition: { duration: 0.18, ease: "easeOut" },
            }
          : undefined
      }
      whileTap={
        isInteractive
          ? {
              scale: 0.97,
              y: 0,
              transition: { duration: 0.12, ease: "easeOut" },
            }
          : undefined
      }
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {children}
    </motion.button>
  );
}
