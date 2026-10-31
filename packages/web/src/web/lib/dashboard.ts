// Coach dashboard layout model. Prototype only: persisted in localStorage, never sent to a server.
import type { GroupFilter } from "./demo-data";

export const DASHBOARD_STORAGE_KEY = "vad-coach-dashboard-v1";

export type WidgetType = "overview" | "physio" | "rest" | "peaking" | "history" | "development" | "fixtures" | "squad";
export type WidgetSize = "S" | "M" | "L";

export type OverviewMetric = "total" | "tested" | "completion" | "notTested" | "due";
export type PhysioMetric = "vo2" | "lt1" | "lt2" | "thresholdHr" | "sweat" | "compare";
export type TestingPeriod = "Latest result" | "Sep 2026 block" | "Mar 2026 block";

export interface WidgetConfig {
  uid: string;
  type: WidgetType;
  size: WidgetSize;
  overviewMetrics?: OverviewMetric[];
  physioMetrics?: PhysioMetric[];
  filter?: GroupFilter;
  period?: TestingPeriod;
}

export const OVERVIEW_METRICS: { key: OverviewMetric; label: string }[] = [
  { key: "total", label: "Total athletes" },
  { key: "tested", label: "Athletes tested" },
  { key: "completion", label: "Testing completion" },
  { key: "notTested", label: "Not yet tested" },
  { key: "due", label: "Due for retesting" },
];

export const PHYSIO_METRICS: { key: PhysioMetric; label: string }[] = [
  { key: "vo2", label: "Average VO₂max" },
  { key: "lt1", label: "Average aerobic threshold (LT1)" },
  { key: "lt2", label: "Average anaerobic threshold (LT2)" },
  { key: "thresholdHr", label: "Average threshold heart rate" },
  { key: "sweat", label: "Average sweat rate" },
  { key: "compare", label: "Individual athlete comparison" },
];

export const TESTING_PERIODS: TestingPeriod[] = ["Latest result", "Sep 2026 block", "Mar 2026 block"];

export const WIDGET_LIBRARY: { type: WidgetType; title: string; blurb: string; defaultSize: WidgetSize }[] = [
  { type: "overview", title: "Team overview", blurb: "Squad size, testing completion, not tested and retest due.", defaultSize: "L" },
  { type: "physio", title: "Physiological performance", blurb: "Comparable averages and athlete comparison. Choose metrics, group and testing period.", defaultSize: "L" },
  { type: "rest", title: "Rest required", blurb: "Coach-entered recovery assessments. Click a category to list athletes.", defaultSize: "M" },
  { type: "peaking", title: "Possible peaking", blurb: "Coach-assigned peaking status. Click an athlete for supporting information.", defaultSize: "M" },
  { type: "history", title: "Testing history", blurb: "Recent and upcoming tests, retest queue, changes since previous block.", defaultSize: "M" },
  { type: "development", title: "Team development", blurb: "Block-to-block VO₂max, LT2 and completion trends, comparable tests only.", defaultSize: "L" },
  { type: "fixtures", title: "Upcoming competitions", blurb: "Upcoming matches, days to next match and planned testing.", defaultSize: "M" },
  { type: "squad", title: "Squad table", blurb: "Compact athlete list with links to each passport.", defaultSize: "L" },
];

export const widgetTitle = (t: WidgetType) => WIDGET_LIBRARY.find((w) => w.type === t)?.title ?? t;

let seq = 0;
export function newUid(type: WidgetType) {
  seq += 1;
  return `${type}-${Date.now().toString(36)}-${seq}`;
}

export function makeWidget(type: WidgetType): WidgetConfig {
  const def = WIDGET_LIBRARY.find((w) => w.type === type)!;
  const base: WidgetConfig = { uid: newUid(type), type, size: def.defaultSize };
  if (type === "overview") base.overviewMetrics = OVERVIEW_METRICS.map((m) => m.key);
  if (type === "physio") {
    base.physioMetrics = ["vo2", "lt1", "lt2", "compare"];
    base.filter = "All athletes";
    base.period = "Latest result";
  }
  return base;
}

// Most useful first: who needs attention, then squad status, then the next match, then physiology.
export function defaultLayout(): WidgetConfig[] {
  return [
    { uid: "d-rest", type: "rest", size: "M" },
    { uid: "d-peaking", type: "peaking", size: "M" },
    { uid: "d-overview", type: "overview", size: "L", overviewMetrics: ["total", "tested", "completion", "notTested", "due"] },
    { uid: "d-fixtures", type: "fixtures", size: "M" },
    { uid: "d-history", type: "history", size: "M" },
    {
      uid: "d-physio",
      type: "physio",
      size: "L",
      physioMetrics: ["vo2", "lt1", "lt2", "compare"],
      filter: "All athletes",
      period: "Latest result",
    },
  ];
}

const TYPES = new Set<WidgetType>(WIDGET_LIBRARY.map((w) => w.type));
const SIZES = new Set<WidgetSize>(["S", "M", "L"]);

export function loadLayout(): WidgetConfig[] {
  try {
    const raw = localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (!raw) return defaultLayout();
    const parsed = JSON.parse(raw) as { version: number; widgets: WidgetConfig[] };
    if (parsed.version !== 1 || !Array.isArray(parsed.widgets)) return defaultLayout();
    const ok = parsed.widgets.filter((w) => w && TYPES.has(w.type) && SIZES.has(w.size) && typeof w.uid === "string");
    return ok;
  } catch {
    return defaultLayout();
  }
}

export function saveLayout(widgets: WidgetConfig[]) {
  localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), widgets }));
}

export function hasSavedLayout() {
  try {
    return localStorage.getItem(DASHBOARD_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function clearSavedLayout() {
  localStorage.removeItem(DASHBOARD_STORAGE_KEY);
}
