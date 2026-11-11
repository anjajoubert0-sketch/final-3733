import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Plain responsive table. `rows` is a list of cells; an empty list shows `empty`. */
export function DataTable({ head, rows, empty = "Nothing here yet.", className }: { head: ReactNode[]; rows: ReactNode[][]; empty?: string; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-[13.5px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground border-b border-border">
            {head.map((h, i) => (
              <th key={i} className="px-4 py-2.5 font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={head.length} className="px-4 py-8 text-center text-muted-foreground">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-t border-border/70 align-top">
                {r.map((c, j) => (
                  <td key={j} className="px-4 py-3">
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="mb-6 flex gap-1 border-b border-border overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "px-4 py-2.5 text-[14px] font-semibold border-b-2 -mb-px whitespace-nowrap",
            value === t.id ? "border-[#2f5d46] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Shows a one-time link with a Copy button. */
export function CopyLink({ path, note }: { path: string; note?: string }) {
  const url = `${window.location.origin}${path}`;
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-md border border-[#2f5d46]/30 bg-[#2f5d46]/6 p-3 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <code className="flex-1 min-w-0 break-all text-[12.5px]">{url}</code>
        <button
          className="rounded-md border border-border bg-card px-3 h-8 text-[13px] font-semibold hover:bg-background"
          onClick={() => navigator.clipboard?.writeText(url).then(() => setCopied(true))}
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      {note && <div className="text-muted-foreground mt-1.5 text-[12.5px]">{note}</div>}
    </div>
  );
}

export const money = (cents: number | null | undefined, currency = "ZAR") =>
  cents === null || cents === undefined ? "To be confirmed" : `${currency === "ZAR" ? "R" : currency + " "}${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const dateTime = (ms: number | null | undefined) => (ms ? new Date(ms).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—");

export function Pill({ children, tone = "stone" }: { children: ReactNode; tone?: "forest" | "ochre" | "clay" | "stone" }) {
  const map = {
    forest: "bg-[#2f5d46]/10 text-[#2f5d46] border-[#2f5d46]/25",
    ochre: "bg-[#b9793a]/12 text-[#7a4c1c] border-[#b9793a]/30",
    clay: "bg-[#b3412b]/10 text-[#8f3320] border-[#b3412b]/25",
    stone: "bg-muted text-muted-foreground border-border",
  };
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap", map[tone])}>{children}</span>;
}
