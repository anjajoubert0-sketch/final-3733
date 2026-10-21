import { createContext, useContext, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { TEAM, type ReportStatus } from "../lib/demo-data";
import { cn } from "@/lib/utils";

// ---------- role (prototype only, no auth) ----------

export type Role = "Practitioner" | "Coach";
const RoleContext = createContext<{ role: Role; setRole: (r: Role) => void }>({ role: "Practitioner", setRole: () => {} });
export const useRole = () => useContext(RoleContext);

// ---------- navigation ----------

const NAV: { href: string; label: string; practitionerOnly?: boolean; placeholder?: boolean }[] = [
  { href: "/", label: "Team dashboard" },
  { href: "/athletes", label: "Team athletes" },
  { href: "/analytics", label: "Team analytics" },
  { href: "/history", label: "Testing history", placeholder: true },
  { href: "/reports", label: "Team reports", placeholder: true },
  { href: "/schedule", label: "Testing schedule", placeholder: true },
  { href: "/practitioner/test-entry", label: "Test entry", practitionerOnly: true },
  { href: "/settings", label: "Settings", placeholder: true },
];

function NavLink({ href, label, placeholder }: { href: string; label: string; placeholder?: boolean }) {
  const [loc] = useLocation();
  const active = href === "/" ? loc === "/" : loc.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-[14px] transition-colors whitespace-nowrap",
        active ? "bg-[#1c2520] text-white" : "text-[#c9cdc5] hover:bg-[#1c2520] hover:text-white",
      )}
    >
      <span>{label}</span>
      {placeholder && <span className="text-[10px] uppercase tracking-wider text-[#7c8f86]">Next</span>}
    </Link>
  );
}

// ---------- layout ----------

export function Shell({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("Practitioner");
  return (
    <RoleContext.Provider value={{ role, setRole }}>
      <div className="min-h-screen lg:flex">
        <aside className="w-full max-w-full overflow-hidden lg:overflow-visible lg:w-[244px] lg:min-h-screen lg:sticky lg:top-0 lg:h-screen shrink-0 bg-[#0f1411] text-[#e9e8e2] flex flex-col">
          <div className="px-5 pt-6 pb-5 border-b border-[#232d27]">
            <Link href="/" className="block">
              <img src="/images/vad-logo-white.png" alt="Vert & Dirt" className="w-[118px] h-auto opacity-95" />
            </Link>
            <div className="mt-4 font-display text-[11px] uppercase tracking-[0.18em] text-[#7c8f86]">Team Performance Portal</div>
          </div>
          <div className="px-4 py-4 border-b border-[#232d27]">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#7c8f86] mb-2">Team</div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-[#2f5d46] grid place-items-center font-display text-[15px] text-white">{TEAM.logoText}</div>
              <div className="min-w-0">
                <div className="font-display text-[15px] uppercase tracking-wide text-white truncate">{TEAM.name}</div>
                <div className="text-[12px] text-[#7c8f86] truncate">{TEAM.label}</div>
              </div>
            </div>
          </div>
          <nav className="flex lg:flex-col gap-1 p-3 overflow-x-auto lg:overflow-visible flex-1">
            {NAV.filter((n) => !(n.practitionerOnly && role !== "Practitioner")).map((n) => (
              <NavLink key={n.href} {...n} />
            ))}
          </nav>
          <div className="hidden lg:block p-4 text-[11px] leading-relaxed text-[#7c8f86] border-t border-[#232d27]">
            Fictional demo data. Values are illustrative only and are not real physiological measurements.
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 lg:px-10 h-14">
              <div className="flex items-center gap-3">
                <span className="rounded-sm bg-[#b9793a]/15 text-[#7a4c1c] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
                  Fictional demo data
                </span>
                <span className="hidden md:inline text-[13px] text-muted-foreground">Prototype · no backend · no authentication</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted-foreground">View as</span>
                <div className="inline-flex rounded-md border border-border bg-card p-0.5">
                  {(["Practitioner", "Coach"] as Role[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setRole(opt)}
                      className={cn(
                        "px-3 py-1 rounded text-[13px] font-medium transition-colors",
                        role === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </header>
          <main className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto">{children}</main>
        </div>
      </div>
    </RoleContext.Provider>
  );
}

// ---------- primitives ----------

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-7 fade-up">
      <div>
        {eyebrow && <div className="text-[12px] uppercase tracking-[0.16em] text-[#2f5d46] font-semibold mb-1">{eyebrow}</div>}
        <h1 className="font-display text-[40px] leading-none uppercase tracking-[0.01em] text-foreground">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({
  title,
  right,
  children,
  className,
  pad = true,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <section className={cn("min-w-0 rounded-[10px] border border-border bg-card", className)}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border/70">
          {title && <h2 className="font-display text-[15px] uppercase tracking-[0.08em] text-foreground">{title}</h2>}
          {right}
        </header>
      )}
      <div className={pad ? "p-5" : ""}>{children}</div>
    </section>
  );
}

const STATUS_STYLE: Record<ReportStatus, string> = {
  Draft: "bg-[#ecebe4] text-[#4f5550]",
  "Under review": "bg-[#b9793a]/15 text-[#7a4c1c]",
  Approved: "bg-[#2f5d46]/12 text-[#2f5d46]",
  Published: "bg-[#16201a] text-[#f5f4ef]",
};

export function StatusPill({ status }: { status: ReportStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider", STATUS_STYLE[status])}>
      {status}
    </span>
  );
}

export function TrendPill({ tone, label }: { tone: "accent" | "clay" | "ochre" | "stone"; label: string }) {
  const map = {
    accent: "bg-[#2f5d46]/12 text-[#2f5d46]",
    clay: "bg-[#b3412b]/12 text-[#8f3320]",
    ochre: "bg-[#b9793a]/15 text-[#7a4c1c]",
    stone: "bg-[#ecebe4] text-[#4f5550]",
  };
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap", map[tone])}>{label}</span>;
}

export function SummaryCard({
  label,
  value,
  unit,
  sub,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="relative rounded-[10px] border border-border bg-card p-5 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent ?? "#2f5d46" }} />
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-display text-[42px] leading-none text-foreground num">{value}</span>
        {unit && <span className="text-[13px] text-muted-foreground">{unit}</span>}
      </div>
      {sub && <div className="mt-2 text-[12.5px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-display text-[26px] leading-none num text-foreground">{value}</span>
        {unit && <span className="text-[12px] text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export function DemoTag() {
  return <span className="rounded-sm border border-dashed border-[#b9793a] text-[#7a4c1c] px-1.5 py-px text-[10px] uppercase tracking-wider">Demo data</span>;
}
