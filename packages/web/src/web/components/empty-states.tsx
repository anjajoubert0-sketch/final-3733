import type { ReactNode } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export function Loading({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("py-16 grid place-items-center text-[13px] text-muted-foreground", className)} role="status">
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 rounded-full border-2 border-[#2f5d46]/25 border-t-[#2f5d46] animate-spin" />
        {label}…
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action, className }: { title: string; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[10px] border border-dashed border-border bg-card/60 px-6 py-10 text-center", className)}>
      <div className="font-display text-[22px] uppercase leading-tight">{title}</div>
      {body && <div className="text-muted-foreground text-[14px] mt-2 max-w-xl mx-auto leading-relaxed">{body}</div>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorNote({ error, className }: { error: unknown; className?: string }) {
  if (!error) return null;
  const msg = error instanceof Error ? error.message : String(error);
  return <div className={cn("rounded-md border border-[#b3412b]/30 bg-[#b3412b]/8 px-3 py-2 text-[13px] text-[#8f3320]", className)}>{msg}</div>;
}

export function NotAvailable({ home = "/" }: { home?: string }) {
  return (
    <div className="min-h-[60vh] grid place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="text-[12px] uppercase tracking-[0.16em] text-[#b3412b] font-semibold">Access</div>
        <h1 className="font-display text-[40px] uppercase leading-none mt-1">Not available for your account</h1>
        <p className="text-muted-foreground text-[14px] mt-3">This page belongs to a different account type. Your data and permissions are unchanged.</p>
        <Link href={home} className={btn("primary", "mt-6")}>
          Go to my home
        </Link>
      </div>
    </div>
  );
}

/** Shared button styles (links and buttons). */
export function btn(kind: "primary" | "ghost" | "ochre" | "danger" = "primary", extra?: string) {
  const base = "inline-flex items-center justify-center gap-2 rounded-md px-4 h-10 text-[14px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";
  const map = {
    primary: "bg-[#2f5d46] text-white hover:bg-[#264d3a]",
    ghost: "border border-border bg-card text-foreground hover:bg-background",
    ochre: "bg-[#b9793a] text-white hover:bg-[#a56a30]",
    danger: "border border-[#b3412b]/40 text-[#8f3320] bg-card hover:bg-[#b3412b]/8",
  };
  return cn(base, map[kind], extra);
}

export const inputCls =
  "w-full h-10 rounded-md border border-border bg-card px-3 text-[14px] outline-none focus:border-[#2f5d46] focus:ring-2 focus:ring-[#2f5d46]/15";
export const labelCls = "block text-[12px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-1.5";
