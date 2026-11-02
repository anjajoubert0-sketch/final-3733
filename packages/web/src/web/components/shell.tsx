import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { STATUS_LABEL, type ReportStatus } from "../lib/demo-data";
import { cn } from "@/lib/utils";
import { useMe } from "../queries/me";
import { useSquadList } from "../queries/squad";
import { useCurrentTeamId } from "../hooks/use-squad";
import { setActiveTeam } from "../hooks/use-active-team";
import { roleLabel } from "../lib/roles";
import { signOut } from "../lib/auth";
import { queryClient } from "./provider";

// ---------- navigation (by role; the server re-checks every request) ----------

type NavItem = { href: string; label: string; placeholder?: boolean };

const COACH_NAV: NavItem[] = [
  { href: "/", label: "Team dashboard" },
  { href: "/athletes", label: "Team athletes" },
  { href: "/analytics", label: "Team analytics" },
  { href: "/team", label: "Team" },
  { href: "/book", label: "Book testing" },
  { href: "/history", label: "Testing history", placeholder: true },
  { href: "/schedule", label: "Testing schedule", placeholder: true },
  { href: "/settings", label: "Settings" },
];

const STAFF_NAV: NavItem[] = [
  { href: "/practitioner", label: "Practitioner hub" },
  { href: "/practitioner/testing", label: "Testing management" },
  { href: "/practitioner/pending", label: "Pending results" },
  { href: "/practitioner/published", label: "Published results" },
  { href: "/practitioner/coaches", label: "Coaches" },
  { href: "/practitioner/individuals", label: "Individuals" },
  { href: "/settings", label: "Settings" },
];

function NavLink({ href, label, placeholder }: NavItem) {
  const [loc] = useLocation();
  const active = href === "/" || href === "/practitioner" ? loc === href : loc.startsWith(href);
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

function TeamBlock() {
  const { data: me } = useMe();
  const teamId = useCurrentTeamId();
  const isCoach = me?.role === "coach";
  const { data: squad } = useSquadList(teamId, isCoach && !!teamId);
  const teams = me?.teams ?? [];
  if (!isCoach) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-[#b9793a] grid place-items-center font-display text-[15px] text-white">VD</div>
        <div className="min-w-0">
          <div className="font-display text-[15px] uppercase tracking-wide text-white truncate">Vert &amp; Dirt Lab</div>
          <div className="text-[12px] text-[#7c8f86] truncate">{me?.isAdmin ? "Practitioner · Admin" : "Practitioner workspace"}</div>
        </div>
      </div>
    );
  }
  const t = squad?.team;
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-[#2f5d46] grid place-items-center font-display text-[15px] text-white">{t?.logoText ?? "—"}</div>
        <div className="min-w-0">
          <div className="font-display text-[15px] uppercase tracking-wide text-white truncate">{t?.name ?? teams[0]?.name ?? "No team yet"}</div>
          <div className="text-[12px] text-[#7c8f86] truncate">{t?.label ?? ""}</div>
        </div>
      </div>
      {teams.length > 1 && (
        <select
          aria-label="Switch team"
          value={teamId}
          onChange={(e) => setActiveTeam(e.target.value)}
          className="mt-3 w-full h-8 rounded-md bg-[#1c2520] border border-[#2a352f] text-[13px] text-white px-2"
        >
          {teams.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function UserMenu() {
  const { data: me } = useMe();
  const [, navigate] = useLocation();
  if (!me) return null;
  return (
    <details className="relative">
      <summary className="list-none cursor-pointer flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1">
        <span className="h-6 w-6 rounded-full bg-[#2f5d46] text-white grid place-items-center text-[11px] font-semibold">
          {me.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </span>
        <span className="text-[13px] font-medium max-w-[140px] truncate">{me.name}</span>
      </summary>
      <div className="absolute right-0 mt-2 w-60 rounded-md border border-border bg-card shadow-lg p-3 z-20">
        <div className="text-[14px] font-semibold truncate">{me.name}</div>
        <div className="text-[12px] text-muted-foreground truncate">{me.email}</div>
        <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#2f5d46] font-semibold">{roleLabel(me)}</div>
        <button
          onClick={async () => {
            await signOut();
            queryClient.clear();
            navigate("/sign-in");
          }}
          className="mt-3 w-full rounded-md border border-border px-3 py-1.5 text-[13px] font-semibold hover:bg-background"
        >
          Sign out
        </button>
      </div>
    </details>
  );
}

// ---------- layout ----------

export function Shell({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const nav = me?.isStaff ? [...STAFF_NAV, ...(me.isAdmin ? [{ href: "/admin", label: "Admin" }] : [])] : COACH_NAV;
  const home = me?.isStaff ? "/practitioner" : "/";
  return (
    <div className="min-h-screen lg:flex">
      <aside className="w-full max-w-full overflow-hidden lg:overflow-visible lg:w-[244px] lg:min-h-screen lg:sticky lg:top-0 lg:h-screen shrink-0 bg-[#0f1411] text-[#e9e8e2] flex flex-col">
        <div className="px-5 pt-6 pb-5 border-b border-[#232d27]">
          <Link href={home} className="block">
            <img src="/images/vad-logo-white.png" alt="Vert & Dirt" className="w-[118px] h-auto opacity-95" />
          </Link>
          <div className="mt-4 font-display text-[11px] uppercase tracking-[0.18em] text-[#7c8f86]">Team Performance Portal</div>
        </div>
        <div className="px-4 py-4 border-b border-[#232d27]">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#7c8f86] mb-2">{me?.isStaff ? "Workspace" : "Team"}</div>
          <TeamBlock />
        </div>
        <nav className="flex lg:flex-col gap-1 p-3 overflow-x-auto lg:overflow-visible flex-1">
          {nav.map((n) => (
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
            <span className="rounded-sm bg-[#b9793a]/15 text-[#7a4c1c] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider">Fictional demo data</span>
            <UserMenu />
          </div>
        </header>
        <main className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto">{children}</main>
      </div>
    </div>
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
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap", STATUS_STYLE[status])}>
      {STATUS_LABEL[status]}
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

// Side sheet for drill-down lists (rest required, possible peaking, athlete details).
export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Close panel" className="absolute inset-0 bg-[#0f1411]/45" onClick={onClose} />
      <dialog
        open
        aria-modal="true"
        aria-label={title}
        className="absolute left-auto right-0 top-0 m-0 p-0 border-0 h-full max-h-none w-full max-w-[460px] bg-card text-foreground shadow-2xl flex flex-col drawer-in"
      >
        <header className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-border">
          <div className="min-w-0">
            {eyebrow && <div className="text-[11px] uppercase tracking-[0.16em] text-[#2f5d46] font-semibold">{eyebrow}</div>}
            <h2 className="font-display text-[24px] uppercase leading-tight">{title}</h2>
          </div>
          <button onClick={onClose} className="rounded-md border border-border px-2.5 py-1 text-[13px] hover:bg-background">
            Close
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </dialog>
    </div>
  );
}

// Labels the type of information a value is, so coach assessments are never read as lab measurements.
export function SourceTag({ kind }: { kind: "Measured" | "Calculated" | "Practitioner interpretation" | "Coach assessment" }) {
  const map = {
    Measured: "border-[#2f5d46]/40 text-[#2f5d46]",
    Calculated: "border-[#7c8f86]/60 text-[#4f5f57]",
    "Practitioner interpretation": "border-[#3c4a56]/40 text-[#3c4a56]",
    "Coach assessment": "border-[#b9793a]/60 text-[#7a4c1c]",
  };
  return <span className={cn("rounded-sm border px-1.5 py-px text-[10px] uppercase tracking-wider whitespace-nowrap", map[kind])}>{kind}</span>;
}
