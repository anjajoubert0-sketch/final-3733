import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import {
  OVERVIEW_METRICS,
  PHYSIO_METRICS,
  WIDGET_LIBRARY,
  clearSavedLayout,
  defaultLayout,
  hasSavedLayout,
  loadLayout,
  makeWidget,
  saveLayout,
  widgetTitle,
  type OverviewMetric,
  type PhysioMetric,
  type WidgetConfig,
  type WidgetSize,
} from "../lib/dashboard";
import { getAthlete } from "../lib/demo-data";
import { DrawerBody, SIZE_LABEL, WIDGETS, type DrawerState } from "./widgets";
import { Drawer } from "./shell";
import { cn } from "@/lib/utils";

const SIZES: WidgetSize[] = ["S", "M", "L"];
const btn = "rounded-md border border-border bg-card px-3 py-1.5 text-[13px] font-semibold hover:bg-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const btnPrimary = "rounded-md bg-[#2f5d46] text-white px-3.5 py-1.5 text-[13px] font-semibold uppercase tracking-[0.06em] hover:bg-[#264d3a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

function snapshot(w: WidgetConfig[]) {
  return JSON.stringify(w);
}

export function CoachDashboard() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => loadLayout());
  const [saved, setSaved] = useState(() => snapshot(loadLayout()));
  const [customised, setCustomised] = useState(() => hasSavedLayout());
  const [editing, setEditing] = useState(false);
  const [settingsFor, setSettingsFor] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [toast, setToast] = useState<string | null>(null);

  const dirty = snapshot(widgets) !== saved;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const update = (c: WidgetConfig) => setWidgets((ws) => ws.map((w) => (w.uid === c.uid ? c : w)));
  const remove = (uid: string) => setWidgets((ws) => ws.filter((w) => w.uid !== uid));
  const add = (type: WidgetConfig["type"]) => {
    const w = makeWidget(type);
    setWidgets((ws) => [...ws, w]);
    setToast(`${widgetTitle(type)} added to the end of the dashboard`);
  };
  const move = (uid: string, delta: number) =>
    setWidgets((ws) => {
      const i = ws.findIndex((w) => w.uid === uid);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= ws.length) return ws;
      const next = [...ws];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const dropOn = (targetUid: string) => {
    if (!dragId || dragId === targetUid) return;
    setWidgets((ws) => {
      const from = ws.findIndex((w) => w.uid === dragId);
      const to = ws.findIndex((w) => w.uid === targetUid);
      if (from < 0 || to < 0) return ws;
      const next = [...ws];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const save = () => {
    saveLayout(widgets);
    setSaved(snapshot(widgets));
    setCustomised(true);
    setToast("Dashboard layout saved in this browser");
  };
  const discard = () => {
    setWidgets(JSON.parse(saved) as WidgetConfig[]);
    setToast("Unsaved changes discarded");
  };
  const restore = () => {
    if (!window.confirm("Restore the default dashboard? Your saved layout in this browser will be removed.")) return;
    clearSavedLayout();
    const d = defaultLayout();
    setWidgets(d);
    setSaved(snapshot(d));
    setCustomised(false);
    setSettingsFor(null);
    setToast("Default dashboard restored");
  };

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    widgets.forEach((w) => m.set(w.type, (m.get(w.type) ?? 0) + 1));
    return m;
  }, [widgets]);

  const closeDrawer = useCallback(() => setDrawer(null), []);
  const drawerTitle =
    drawer?.kind === "rest"
      ? drawer.status
        ? `Rest required · ${drawer.status}`
        : "Rest required"
      : drawer?.kind === "peaking"
        ? drawer.status ?? "Possible peaking"
        : drawer?.kind === "athlete"
          ? (getAthlete(drawer.id)?.name ?? "Athlete")
          : "";

  return (
    <div>
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-[22px] uppercase tracking-[0.04em] leading-none">Coach dashboard</h2>
          <p className="text-[12.5px] text-muted-foreground mt-1">
            {customised ? "Your saved layout (stored in this browser only)." : "Default layout: who needs attention first, then squad status, next match and physiology."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty && <span className="text-[12px] font-semibold text-[#7a4c1c] bg-[#b9793a]/15 rounded-sm px-2 py-1">Unsaved changes</span>}
          {dirty && !editing && (
            <>
              <button className={btn} onClick={discard}>
                Discard
              </button>
              <button className={btnPrimary} onClick={save}>
                Save layout
              </button>
            </>
          )}
          <button
            className={editing ? btn : btnPrimary}
            aria-expanded={editing}
            onClick={() => {
              setEditing((e) => !e);
              setSettingsFor(null);
            }}
          >
            {editing ? "Done customising" : "Customise dashboard"}
          </button>
        </div>
      </div>

      {/* customise panel */}
      {editing && (
        <section className="rounded-[10px] border-2 border-[#2f5d46]/40 bg-card p-5 mb-5 fade-up" aria-label="Customise dashboard">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-display text-[17px] uppercase tracking-[0.06em]">Available blocks</h3>
              <p className="text-[12.5px] text-muted-foreground mt-0.5">
                Add blocks below. Drag blocks on the dashboard to reorder (or use the arrows), pick a size, and open ⚙ to choose metrics.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={btn} onClick={restore}>
                Restore default
              </button>
              <button className={btn} onClick={discard} disabled={!dirty}>
                Discard changes
              </button>
              <button className={btnPrimary} onClick={save} disabled={!dirty}>
                Save layout
              </button>
            </div>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            {WIDGET_LIBRARY.map((w) => {
              const n = counts.get(w.type) ?? 0;
              return (
                <div key={w.type} className="rounded-[8px] border border-border bg-background/60 p-3 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-[14px] leading-tight">{w.title}</div>
                    {n > 0 && <span className="text-[10.5px] uppercase tracking-wider text-[#2f5d46] font-semibold whitespace-nowrap">On dashboard{n > 1 ? ` ×${n}` : ""}</span>}
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-1 flex-1">{w.blurb}</p>
                  <button onClick={() => add(w.type)} aria-label={`Add ${w.title} block`} className="mt-2.5 self-start text-[12.5px] font-semibold text-[#2f5d46] hover:underline">
                    + Add {n > 0 ? "another" : "block"}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11.5px] text-muted-foreground">Prototype: layout is saved to local browser storage, not to an account. It will not follow you to another device.</p>
        </section>
      )}

      {/* grid */}
      {widgets.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border bg-card p-10 text-center">
          <div className="font-display text-[20px] uppercase">No blocks on your dashboard</div>
          <p className="text-[13px] text-muted-foreground mt-1">Open Customise dashboard to add blocks, or restore the default layout.</p>
          {!editing && (
            <button className={btnPrimary + " mt-4"} onClick={() => setEditing(true)}>
              Customise dashboard
            </button>
          )}
        </div>
      ) : (
        <div className="dash-grid">
          {widgets.map((w, i) => {
            const W = WIDGETS[w.type];
            const dragProps = editing
              ? {
                  draggable: true,
                  onDragStart: (e: DragEvent) => {
                    setDragId(w.uid);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", w.uid);
                  },
                  onDragEnd: () => {
                    setDragId(null);
                    setOverId(null);
                  },
                  onDragOver: (e: DragEvent) => {
                    e.preventDefault();
                    if (overId !== w.uid) setOverId(w.uid);
                  },
                  onDragLeave: () => setOverId((o) => (o === w.uid ? null : o)),
                  onDrop: (e: DragEvent) => {
                    e.preventDefault();
                    dropOn(w.uid);
                    setOverId(null);
                  },
                }
              : {};
            return (
              <section
                key={w.uid}
                {...dragProps}
                data-widget={w.type}
                className={cn(
                  "min-w-0 rounded-[10px] border bg-card flex flex-col",
                  `w-${w.size}`,
                  editing ? "border-[#2f5d46]/40 cursor-grab" : "border-border",
                  dragId === w.uid && "w-dragging",
                  overId === w.uid && dragId !== w.uid && "w-over",
                )}
              >
                <header className="flex items-center justify-between gap-2 px-5 pt-4 pb-3 border-b border-border/70">
                  <div className="flex items-center gap-2 min-w-0">
                    {editing && (
                      <span aria-hidden className="text-muted-foreground select-none text-[16px] leading-none" title="Drag to reorder">
                        ⠿
                      </span>
                    )}
                    <h2 className="font-display text-[15px] uppercase tracking-[0.08em] truncate">{widgetTitle(w.type)}</h2>
                  </div>
                  {editing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button aria-label="Move block earlier" className="h-7 w-7 rounded border border-border text-[13px] hover:bg-background disabled:opacity-30" disabled={i === 0} onClick={() => move(w.uid, -1)}>
                        ↑
                      </button>
                      <button aria-label="Move block later" className="h-7 w-7 rounded border border-border text-[13px] hover:bg-background disabled:opacity-30" disabled={i === widgets.length - 1} onClick={() => move(w.uid, 1)}>
                        ↓
                      </button>
                      <div className="inline-flex rounded border border-border overflow-hidden ml-1" title="Block size">
                        {SIZES.map((s) => (
                          <button
                            key={s}
                            title={SIZE_LABEL[s]}
                            aria-pressed={w.size === s}
                            onClick={() => update({ ...w, size: s })}
                            className={cn("h-7 w-7 text-[12px] font-semibold", w.size === s ? "bg-[#2f5d46] text-white" : "hover:bg-background")}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      {(w.type === "overview" || w.type === "physio") && (
                        <button
                          aria-label="Choose metrics"
                          aria-expanded={settingsFor === w.uid}
                          className={cn("h-7 w-7 rounded border border-border text-[13px] ml-1", settingsFor === w.uid ? "bg-[#2f5d46] text-white" : "hover:bg-background")}
                          onClick={() => setSettingsFor((s) => (s === w.uid ? null : w.uid))}
                        >
                          ⚙
                        </button>
                      )}
                      <button aria-label={`Remove ${widgetTitle(w.type)}`} className="h-7 w-7 rounded border border-border text-[14px] ml-1 hover:bg-[#b3412b] hover:text-white hover:border-[#b3412b]" onClick={() => remove(w.uid)}>
                        ×
                      </button>
                    </div>
                  )}
                </header>
                {editing && settingsFor === w.uid && <MetricPicker w={w} onChange={update} />}
                <div className="p-5 flex-1 min-w-0">
                  <W config={w} onChange={update} openDrawer={setDrawer} />
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Drawer open={drawer !== null} onClose={closeDrawer} title={drawerTitle} eyebrow={drawer?.kind === "athlete" ? "Supporting information" : "Coach assessment"}>
        {drawer && <DrawerBody state={drawer} openDrawer={setDrawer} />}
      </Drawer>

      {toast && (
        <output className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 rounded-md bg-[#0f1411] text-white px-4 py-2.5 text-[13px] shadow-xl fade-up">
          {toast}
        </output>
      )}
    </div>
  );
}

function MetricPicker({ w, onChange }: { w: WidgetConfig; onChange: (c: WidgetConfig) => void }) {
  const isOverview = w.type === "overview";
  const options = isOverview ? OVERVIEW_METRICS : PHYSIO_METRICS;
  const selected: string[] = (isOverview ? w.overviewMetrics : w.physioMetrics) ?? [];
  const toggle = (k: string) => {
    const next = selected.includes(k) ? selected.filter((x) => x !== k) : [...selected, k];
    // keep library order
    const ordered = options.map((o) => o.key).filter((key) => next.includes(key));
    onChange(isOverview ? { ...w, overviewMetrics: ordered as OverviewMetric[] } : { ...w, physioMetrics: ordered as PhysioMetric[] });
  };
  return (
    <div className="px-5 py-3 border-b border-border/70 bg-background/60">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-2">Metrics shown in this block</div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {options.map((o) => (
          <label key={o.key} className="inline-flex items-center gap-2 text-[13px] cursor-pointer">
            <input type="checkbox" aria-label={o.label} className="accent-[#2f5d46] h-4 w-4" checked={selected.includes(o.key)} onChange={() => toggle(o.key)} />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}
