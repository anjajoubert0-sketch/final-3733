// FICTIONAL DEMO DATA. Not real athletes, not real physiological measurements.
// Shaped like the data model in the brief (teams, athletes, memberships, test sessions,
// results, reports) so the prototype can later be wired to a real backend.

export const TODAY = "2026-10-21";
export const MIN_GROUP_N = 5; // POPIA small-group rule: suppress aggregates below this n

export type Event = "800 m" | "1500 m" | "3000 m" | "5000 m" | "10,000 m";
export type EventGroup = "Middle distance (800–1500 m)" | "Distance (3000–10,000 m)";
export type ReportStatus = "Draft" | "Under review" | "Approved" | "Published";
export type TestType = "Lactate threshold" | "VO2 max" | "Sweat";

export interface TestRecord {
  id: string;
  date: string;
  type: TestType;
  status: ReportStatus;
  protocol: string;
}

export interface Athlete {
  id: string;
  name: string;
  sex: "F" | "M";
  dob: string;
  heightCm: number;
  weightKg: number;
  event: Event;
  secondarySport?: string;
  experience: string;
  goals: string[];
  tested: boolean;
  lastTest?: string;
  prevTest?: string;
  // Latest published values (undefined = not measured)
  vo2?: number;
  vo2Prev?: number;
  lt1Pace?: number; // sec/km
  lt1Hr?: number;
  lt2Pace?: number; // sec/km
  lt2PacePrev?: number;
  lt2Hr?: number;
  sweatRate?: number; // L/h
  sodium?: number; // mmol/L
  status: ReportStatus;
  zonesSet: boolean;
  tests: TestRecord[];
}

export const TEAM = {
  id: "demo-athletics",
  name: "Demo Athletics Team",
  label: "Maties-style demo team",
  sport: "Athletics",
  logoText: "DA",
  headCoach: "N. Vosloo",
  season: "2026/27",
  lastTestingDate: "2026-09-12",
  nextTestingDate: "2026-11-16",
};

export const EVENT_GROUP: Record<Event, EventGroup> = {
  "800 m": "Middle distance (800–1500 m)",
  "1500 m": "Middle distance (800–1500 m)",
  "3000 m": "Distance (3000–10,000 m)",
  "5000 m": "Distance (3000–10,000 m)",
  "10,000 m": "Distance (3000–10,000 m)",
};

const RAW: Omit<Athlete, "tests">[] = [
  { id: "a01", name: "Aviwe Khumalo", sex: "M", dob: "2001-05-14", heightCm: 181, weightKg: 71, event: "800 m", experience: "9 years", goals: ["Sub-1:48 800 m", "Two quality sessions per week"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 69.4, vo2Prev: 68.1, lt1Pace: 250, lt1Hr: 152, lt2Pace: 200, lt2PacePrev: 206, lt2Hr: 178, sweatRate: 1.3, sodium: 820, status: "Published", zonesSet: true },
  { id: "a02", name: "Jess Calitz", sex: "F", dob: "2003-11-02", heightCm: 168, weightKg: 56, event: "800 m", experience: "6 years", goals: ["Podium at provincial champs"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 63.8, vo2Prev: 62.9, lt1Pace: 262, lt1Hr: 149, lt2Pace: 212, lt2PacePrev: 216, lt2Hr: 175, status: "Approved", zonesSet: true },
  { id: "a15", name: "Naledi Mahlangu", sex: "F", dob: "2004-02-20", heightCm: 164, weightKg: 53, event: "800 m", experience: "3 years", goals: ["First baseline test"], tested: false, status: "Draft", zonesSet: false },
  { id: "a03", name: "Kyle Adendorff", sex: "M", dob: "1999-08-08", heightCm: 178, weightKg: 66, event: "1500 m", secondarySport: "Road running", experience: "11 years", goals: ["Sub-3:35 1500 m"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 70.1, vo2Prev: 71.5, lt1Pace: 246, lt1Hr: 150, lt2Pace: 208, lt2PacePrev: 205, lt2Hr: 179, status: "Published", zonesSet: true },
  { id: "a04", name: "Zanele Dube", sex: "F", dob: "2002-03-27", heightCm: 170, weightKg: 58, event: "1500 m", experience: "7 years", goals: ["Sub-4:10 1500 m"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 66.0, vo2Prev: 64.2, lt1Pace: 268, lt1Hr: 146, lt2Pace: 230, lt2PacePrev: 240, lt2Hr: 176, status: "Published", zonesSet: true },
  { id: "a05", name: "Tumi Sithole", sex: "F", dob: "2000-07-11", heightCm: 166, weightKg: 55, event: "1500 m", experience: "5 years", goals: ["Return to racing after injury"], tested: true, lastTest: "2026-03-18", prevTest: "2025-11-20", vo2: 65.3, vo2Prev: 65.0, lt1Pace: 270, lt1Hr: 147, lt2Pace: 234, lt2PacePrev: 236, lt2Hr: 174, status: "Published", zonesSet: true },
  { id: "a06", name: "Hannes Venter", sex: "M", dob: "2000-01-30", heightCm: 183, weightKg: 68, event: "3000 m", secondarySport: "Cross country", experience: "10 years", goals: ["Sub-7:50 3000 m steeplechase base"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 74.9, vo2Prev: 72.0, lt1Pace: 232, lt1Hr: 155, lt2Pace: 224, lt2PacePrev: 232, lt2Hr: 181, sweatRate: 1.5, sodium: 910, status: "Under review", zonesSet: false },
  { id: "a07", name: "Lindiwe Nkosi", sex: "F", dob: "2003-06-05", heightCm: 172, weightKg: 57, event: "3000 m", experience: "6 years", goals: ["Sub-8:50 3000 m"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 70.3, vo2Prev: 69.0, lt1Pace: 252, lt1Hr: 150, lt2Pace: 238, lt2PacePrev: 243, lt2Hr: 177, status: "Published", zonesSet: true },
  { id: "a08", name: "Pieter Bosch", sex: "M", dob: "1998-12-16", heightCm: 180, weightKg: 64, event: "3000 m", secondarySport: "Trail running", experience: "13 years", goals: ["Trail season base build"], tested: true, lastTest: "2026-04-02", prevTest: "2025-10-08", vo2: 71.6, vo2Prev: 71.2, lt1Pace: 240, lt1Hr: 153, lt2Pace: 228, lt2PacePrev: 229, lt2Hr: 180, status: "Published", zonesSet: true },
  { id: "a09", name: "Mpho Radebe", sex: "M", dob: "1997-09-03", heightCm: 176, weightKg: 62, event: "5000 m", secondarySport: "Trail running", experience: "14 years", goals: ["Trail ultra base", "Sub-14:00 5000 m"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 73.0, vo2Prev: 73.2, lt1Pace: 238, lt1Hr: 152, lt2Pace: 235, lt2PacePrev: 233, lt2Hr: 181, status: "Published", zonesSet: true },
  { id: "a10", name: "Chloe Fourie", sex: "F", dob: "2001-04-19", heightCm: 169, weightKg: 58, event: "5000 m", experience: "8 years", goals: ["Sub-16:30 5000 m"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 68.4, vo2Prev: 67.0, lt1Pace: 262, lt1Hr: 148, lt2Pace: 252, lt2PacePrev: 258, lt2Hr: 178, status: "Published", zonesSet: true },
  { id: "a11", name: "Sipho Mabena", sex: "M", dob: "2002-10-25", heightCm: 179, weightKg: 65, event: "5000 m", experience: "4 years", goals: ["First baseline test"], tested: false, status: "Draft", zonesSet: false },
  { id: "a12", name: "Dylan Smit", sex: "M", dob: "1996-02-08", heightCm: 175, weightKg: 63, event: "10,000 m", secondarySport: "Road running", experience: "12 years", goals: ["Sub-29:30 10 km road"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 71.2, vo2Prev: 70.0, lt1Pace: 255, lt1Hr: 151, lt2Pace: 244, lt2PacePrev: 248, lt2Hr: 179, status: "Published", zonesSet: true },
  { id: "a13", name: "Anke Strydom", sex: "F", dob: "1999-11-12", heightCm: 171, weightKg: 59, event: "10,000 m", secondarySport: "Road running", experience: "9 years", goals: ["Sub-34:00 10 km road"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 65.9, vo2Prev: 65.1, lt1Pace: 282, lt1Hr: 145, lt2Pace: 260, lt2PacePrev: 262, lt2Hr: 174, status: "Published", zonesSet: true },
  { id: "a14", name: "Ayanda Zulu", sex: "F", dob: "2001-08-22", heightCm: 167, weightKg: 54, event: "10,000 m", secondarySport: "Trail running", experience: "5 years", goals: ["Trail 25 km"], tested: true, lastTest: "2026-02-10", prevTest: "2025-09-16", vo2: 64.2, vo2Prev: 63.5, lt1Pace: 276, lt1Hr: 146, lt2Pace: 262, lt2PacePrev: 268, lt2Hr: 172, status: "Published", zonesSet: true },
];

const PROTOCOL_LT = "Incremental treadmill, 4 min stages, 1.0 km/h steps, capillary lactate at stage end (demo)";
const PROTOCOL_VO2 = "Incremental treadmill to exhaustion, breath-by-breath gas analysis (demo)";
const PROTOCOL_SWEAT = "Patch sweat test, 60 min run at fixed intensity, ambient conditions logged (demo)";

function makeTests(a: Omit<Athlete, "tests">): TestRecord[] {
  if (!a.tested || !a.lastTest) return [];
  const tests: TestRecord[] = [];
  if (a.prevTest) {
    tests.push({ id: `${a.id}-lt-prev`, date: a.prevTest, type: "Lactate threshold", status: "Published", protocol: PROTOCOL_LT });
    tests.push({ id: `${a.id}-vo2-prev`, date: a.prevTest, type: "VO2 max", status: "Published", protocol: PROTOCOL_VO2 });
  }
  tests.push({ id: `${a.id}-lt`, date: a.lastTest, type: "Lactate threshold", status: a.status, protocol: PROTOCOL_LT });
  tests.push({ id: `${a.id}-vo2`, date: a.lastTest, type: "VO2 max", status: a.status, protocol: PROTOCOL_VO2 });
  if (a.sweatRate !== undefined) {
    tests.push({ id: `${a.id}-sweat`, date: a.lastTest, type: "Sweat", status: a.status, protocol: PROTOCOL_SWEAT });
  }
  return tests;
}

export const ATHLETES: Athlete[] = RAW.map((a) => ({ ...a, tests: makeTests(a) }));

export const EVENTS: Event[] = ["800 m", "1500 m", "3000 m", "5000 m", "10,000 m"];

export function getAthlete(id: string | undefined) {
  return ATHLETES.find((a) => a.id === id);
}

export function getTest(athlete: Athlete, testId: string | undefined) {
  return athlete.tests.find((t) => t.id === testId);
}

// ---------- formatting ----------

export function fmtPace(sec?: number) {
  if (sec === undefined || sec === null) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

export function fmtNum(v?: number, digits = 1) {
  return v === undefined || v === null ? "—" : v.toFixed(digits);
}

export function age(dob: string) {
  const d = new Date(dob + "T00:00:00");
  const t = new Date(TODAY + "T00:00:00");
  let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
  return a;
}

export function daysSince(iso?: string) {
  if (!iso) return Infinity;
  return Math.floor((new Date(TODAY).getTime() - new Date(iso).getTime()) / 86400000);
}

// ---------- derived values ----------

export const RETEST_AFTER_DAYS = 120; // practitioner-set default; due when last test is older than this

export function isDueForRetest(a: Athlete) {
  return a.tested && daysSince(a.lastTest) > RETEST_AFTER_DAYS;
}

export function reportVisible(a: Athlete) {
  return a.status === "Published" || a.status === "Approved";
}

export interface ChangeThresholds {
  vo2: number; // ml/kg/min
  lt2: number; // sec/km
}
export const DEFAULT_THRESHOLDS: ChangeThresholds = { vo2: 1.0, lt2: 3 };

export type Trend = "Improving" | "Stable" | "Requires investigation" | "Mixed" | "No comparison";

export function classify(a: Athlete, t: ChangeThresholds = DEFAULT_THRESHOLDS): Trend {
  if (a.vo2 === undefined || a.vo2Prev === undefined || a.lt2Pace === undefined || a.lt2PacePrev === undefined) {
    return "No comparison";
  }
  const signals: number[] = [];
  const dv = a.vo2 - a.vo2Prev;
  if (dv >= t.vo2) signals.push(1);
  if (dv <= -t.vo2) signals.push(-1);
  const dl = a.lt2Pace - a.lt2PacePrev; // negative = faster
  if (dl <= -t.lt2) signals.push(1);
  if (dl >= t.lt2) signals.push(-1);
  const up = signals.includes(1);
  const down = signals.includes(-1);
  if (up && down) return "Mixed";
  if (up) return "Improving";
  if (down) return "Requires investigation";
  return "Stable";
}

export function trendTone(t: Trend) {
  switch (t) {
    case "Improving":
      return "accent";
    case "Requires investigation":
      return "clay";
    case "Mixed":
      return "ochre";
    default:
      return "stone";
  }
}

export function changeText(a: Athlete) {
  if (a.vo2 === undefined || a.vo2Prev === undefined) return "—";
  const dv = a.vo2 - a.vo2Prev;
  const parts = [`VO₂ ${dv >= 0 ? "+" : "−"}${Math.abs(dv).toFixed(1)}`];
  if (a.lt2Pace !== undefined && a.lt2PacePrev !== undefined) {
    const dl = a.lt2Pace - a.lt2PacePrev;
    parts.push(`LT2 ${dl >= 0 ? "+" : "−"}${Math.abs(Math.round(dl))} s/km`);
  }
  return parts.join(" · ");
}

// Demo lactate curve: L(v) = 1 + 3·exp(k·(v − v2)) so that L(v2)=4.0 and L(v1)=2.0 mmol/L.
export interface Stage {
  n: number;
  speedKmh: number;
  pace: number; // sec/km
  hr: number;
  lactate: number;
  rpe: number;
}

export function lactateStages(a: Athlete): Stage[] {
  if (a.lt1Pace === undefined || a.lt2Pace === undefined || a.lt1Hr === undefined || a.lt2Hr === undefined) return [];
  const v1 = 3600 / a.lt1Pace;
  const v2 = 3600 / a.lt2Pace;
  const k = Math.log(3) / (v2 - v1);
  const start = Math.floor(v1) - 2;
  const end = Math.round(v2) + 3;
  const stages: Stage[] = [];
  let n = 1;
  for (let v = start; v <= end; v++) {
    const lactate = 1 + 3 * Math.exp(k * (v - v2));
    const hr = a.lt1Hr + ((v - v1) * (a.lt2Hr - a.lt1Hr)) / (v2 - v1);
    stages.push({
      n: n++,
      speedKmh: v,
      pace: 3600 / v,
      hr: Math.round(hr),
      lactate: Math.round(lactate * 10) / 10,
      rpe: Math.max(6, Math.min(19, Math.round(9 + (v - v1) * 1.2))),
    });
  }
  return stages;
}

export interface Zone {
  name: string;
  label: string;
  fromPace?: number; // faster bound, sec/km
  toPace?: number; // slower bound, sec/km
}

export function zones(a: Athlete): Zone[] {
  if (a.lt1Pace === undefined || a.lt2Pace === undefined) return [];
  const mid = (a.lt1Pace + a.lt2Pace) / 2;
  return [
    { name: "Z1", label: "Easy", fromPace: a.lt1Pace },
    { name: "Z2", label: "Aerobic", fromPace: mid, toPace: a.lt1Pace },
    { name: "Z3", label: "Threshold", fromPace: a.lt2Pace, toPace: mid },
    { name: "Z4", label: "Above threshold", toPace: a.lt2Pace },
  ];
}

export function teamStats(list: Athlete[]) {
  const tested = list.filter((a) => a.tested);
  const withVo2 = tested.filter((a) => a.vo2 !== undefined);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : undefined);
  return {
    total: list.length,
    tested: tested.length,
    completion: list.length ? Math.round((tested.length / list.length) * 100) : 0,
    vo2: withVo2.length >= MIN_GROUP_N ? avg(withVo2.map((a) => a.vo2!)) : undefined,
    vo2N: withVo2.length,
    lt1Hr: tested.length >= MIN_GROUP_N ? avg(tested.filter((a) => a.lt1Hr).map((a) => a.lt1Hr!)) : undefined,
    lt2Hr: tested.length >= MIN_GROUP_N ? avg(tested.filter((a) => a.lt2Hr).map((a) => a.lt2Hr!)) : undefined,
    due: list.filter(isDueForRetest).length,
    notTested: list.filter((a) => !a.tested).length,
  };
}

// Aggregate display: value, or an explicit reason when the group is too small or the value is absent.
export function aggText(value: number | undefined, n: number, digits = 1, unit = "") {
  if (value !== undefined) return `${value.toFixed(digits)}${unit ? " " + unit : ""}`;
  if (n > 0 && n < MIN_GROUP_N) return `Suppressed (n=${n})`;
  return "—";
}

export const GROUP_FILTERS = ["All events", "Middle distance (800–1500 m)", "Distance (3000–10,000 m)", ...EVENTS] as const;
export type GroupFilter = (typeof GROUP_FILTERS)[number];

export function filterAthletes(list: Athlete[], f: GroupFilter) {
  if (f === "All events") return list;
  if (f === "Middle distance (800–1500 m)" || f === "Distance (3000–10,000 m)") return list.filter((a) => EVENT_GROUP[a.event] === f);
  return list.filter((a) => a.event === f);
}

export function paceText(a: Athlete, which: "lt1" | "lt2") {
  const p = which === "lt1" ? a.lt1Pace : a.lt2Pace;
  const hr = which === "lt1" ? a.lt1Hr : a.lt2Hr;
  if (!a.tested) return "Not tested";
  if (p === undefined) return "—";
  return `${fmtPace(p)}/km · ${hr ?? "—"} bpm`;
}

// Sport-specific interpretation (demo copy, practitioner review required before use).
export function interpretation(a: Athlete) {
  const gap = a.lt1Pace && a.lt2Pace ? a.lt1Pace - a.lt2Pace : undefined;
  const lines: string[] = [];
  if (a.event === "800 m" || a.event === "1500 m") {
    lines.push("Middle-distance profile: race pace sits close to LT2, so repeated threshold-plus efforts and speed endurance drive the next block.");
  } else {
    lines.push("Distance profile: aerobic capacity and the Z2/Z3 boundary carry most of the training load; keep long runs honest to LT1.");
  }
  if (gap !== undefined) {
    lines.push(`Demo pace gap between LT1 and LT2 is ${Math.round(gap)} s/km; a narrower gap usually means the threshold is closer to the aerobic ceiling.`);
  }
  if (a.vo2 !== undefined && a.vo2Prev !== undefined) {
    const d = a.vo2 - a.vo2Prev;
    lines.push(
      Math.abs(d) < 1
        ? "VO₂max is within the ±1.0 ml/kg/min practitioner threshold, so treat it as stable."
        : d > 0
          ? "VO₂max change is above the practitioner threshold; confirm with training log before attributing to adaptation."
          : "VO₂max has fallen beyond the practitioner threshold; review training load, illness and sleep before retesting.",
    );
  }
  return lines;
}
