// FICTIONAL DEMO DATA. Not real athletes, not real physiological measurements.
// Shaped like the data model in the brief (teams, athletes, memberships, test sessions,
// results, reports, recovery and peaking assessments) so the prototype can later be wired to a real backend.

export const TODAY = "2026-10-21";
export const MIN_GROUP_N = 5; // POPIA small-group rule: suppress aggregates below this n

export type Position =
  | "Loosehead prop"
  | "Hooker"
  | "Tighthead prop"
  | "Lock"
  | "Blindside flanker"
  | "Openside flanker"
  | "Number 8"
  | "Scrumhalf"
  | "Flyhalf"
  | "Inside centre"
  | "Outside centre"
  | "Wing"
  | "Fullback";
export type PositionGroup = "Forwards" | "Backs";
export type ReportStatus = "Draft" | "Under review" | "Approved" | "Published";
export type TestType = "Lactate threshold" | "VO2 max" | "Sweat";

// Coach-entered recovery categories. Never derived from VO₂max or lactate.
export type RestStatus = "Green" | "Amber" | "Red" | "Grey";
// Coach assessments. Never derived from VO₂max or lactate alone.
export type PeakingStatus =
  | "Building"
  | "Maintaining"
  | "Potentially approaching peak"
  | "Tapering"
  | "Competition ready — coach assessed"
  | "Insufficient data";

export const REST_LABEL: Record<RestStatus, string> = {
  Green: "No additional rest flagged",
  Amber: "Recovery review recommended",
  Red: "Rest or further assessment flagged",
  Grey: "Insufficient information",
};

export interface TestRecord {
  id: string;
  date: string;
  type: TestType;
  status: ReportStatus;
  protocol: string;
}

export interface Assessment<T> {
  status: T;
  assessedOn?: string;
  note?: string;
}

export interface Athlete {
  id: string;
  name: string;
  sex: "F" | "M";
  dob: string;
  heightCm: number;
  weightKg: number;
  position: Position;
  experience: string;
  goals: string[];
  tested: boolean;
  lastTest?: string;
  prevTest?: string;
  // Latest published values (undefined = not measured). Previous-block values only where a comparable test exists.
  vo2?: number; // ml/kg/min
  vo2Prev?: number;
  lt1Pace?: number; // sec/km
  lt1PacePrev?: number;
  lt1Hr?: number;
  lt2Pace?: number; // sec/km
  lt2PacePrev?: number;
  lt2Hr?: number;
  sweatRate?: number; // L/h
  sodium?: number; // mmol/L (sweat sodium concentration)
  status: ReportStatus;
  zonesSet: boolean;
  tests: TestRecord[];
  rest: Assessment<RestStatus>; // Coach-entered recovery assessment (demo)
  peaking: Assessment<PeakingStatus>; // Coach assessment (demo)
}

export const TEAM = {
  id: "bigboys-rugby",
  name: "BigBoys Rugby",
  label: "Fictional demo squad",
  sport: "Rugby union",
  logoText: "BB",
  headCoach: "N. Vosloo",
  season: "2026/27",
  lastTestingDate: "2026-09-12",
  nextTestingDate: "2026-11-16",
};

export const POSITIONS: Position[] = [
  "Loosehead prop",
  "Hooker",
  "Tighthead prop",
  "Lock",
  "Blindside flanker",
  "Openside flanker",
  "Number 8",
  "Scrumhalf",
  "Flyhalf",
  "Inside centre",
  "Outside centre",
  "Wing",
  "Fullback",
];

export const POSITION_GROUP: Record<Position, PositionGroup> = {
  "Loosehead prop": "Forwards",
  Hooker: "Forwards",
  "Tighthead prop": "Forwards",
  Lock: "Forwards",
  "Blindside flanker": "Forwards",
  "Openside flanker": "Forwards",
  "Number 8": "Forwards",
  Scrumhalf: "Backs",
  Flyhalf: "Backs",
  "Inside centre": "Backs",
  "Outside centre": "Backs",
  Wing: "Backs",
  Fullback: "Backs",
};

const RAW: Omit<Athlete, "tests" | "rest" | "peaking">[] = [
  // Forwards
  { id: "f01", name: "Thabo Mokoena", sex: "M", dob: "1999-05-14", heightCm: 183, weightKg: 112, position: "Loosehead prop", experience: "8 years", goals: ["Scrum stability under load", "Sustain 80 min work rate"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 53.1, vo2Prev: 52.4, lt1Pace: 392, lt1PacePrev: 398, lt1Hr: 147, lt2Pace: 318, lt2PacePrev: 326, lt2Hr: 172, sweatRate: 1.6, sodium: 52, status: "Published", zonesSet: true },
  { id: "f02", name: "Ruan Pretorius", sex: "M", dob: "2002-02-20", heightCm: 181, weightKg: 108, position: "Loosehead prop", experience: "5 years", goals: ["Maintain scrum output in the final 20 min"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 51.8, vo2Prev: 52.6, lt1Pace: 388, lt1PacePrev: 388, lt1Hr: 149, lt2Pace: 330, lt2PacePrev: 327, lt2Hr: 176, status: "Approved", zonesSet: true },
  { id: "f03", name: "Sibusiso Ndlovu", sex: "M", dob: "2000-08-02", heightCm: 178, weightKg: 103, position: "Hooker", experience: "9 years", goals: ["Lineout throw consistency", "Repeat sprint ability"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 55.6, vo2Prev: 54.0, lt1Pace: 380, lt1PacePrev: 391, lt1Hr: 148, lt2Pace: 312, lt2PacePrev: 324, lt2Hr: 174, sweatRate: 1.8, sodium: 48, status: "Published", zonesSet: true },
  { id: "f04", name: "Jacques Olivier", sex: "M", dob: "1995-11-08", heightCm: 180, weightKg: 104, position: "Hooker", experience: "13 years", goals: ["Return to pre-injury aerobic base"], tested: true, lastTest: "2026-03-18", prevTest: "2025-11-20", vo2: 52.0, vo2Prev: 52.9, lt1Pace: 402, lt1PacePrev: 405, lt1Hr: 150, lt2Pace: 327, lt2PacePrev: 330, lt2Hr: 178, status: "Published", zonesSet: true },
  { id: "f05", name: "Luca Ferreira", sex: "M", dob: "2004-01-30", heightCm: 176, weightKg: 99, position: "Hooker", experience: "4 years", goals: ["Build aerobic base in pre-season"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 56.2, vo2Prev: 55.1, lt1Pace: 372, lt1PacePrev: 380, lt1Hr: 151, lt2Pace: 305, lt2PacePrev: 318, lt2Hr: 178, status: "Published", zonesSet: true },
  { id: "f06", name: "Bongani Sithebe", sex: "M", dob: "1997-03-27", heightCm: 185, weightKg: 118, position: "Tighthead prop", experience: "10 years", goals: ["Scrum reset endurance"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 50.4, vo2Prev: 50.9, lt1Pace: 398, lt1PacePrev: 402, lt1Hr: 146, lt2Pace: 336, lt2PacePrev: 340, lt2Hr: 171, sweatRate: 2.0, sodium: 61, status: "Under review", zonesSet: false },
  { id: "f07", name: "Dewald Human", sex: "M", dob: "1993-07-11", heightCm: 186, weightKg: 120, position: "Tighthead prop", experience: "14 years", goals: ["Maintain playing load across the season"], tested: true, lastTest: "2026-02-10", prevTest: "2025-09-16", vo2: 49.7, vo2Prev: 49.8, lt1Pace: 408, lt1PacePrev: 410, lt1Hr: 145, lt2Pace: 344, lt2PacePrev: 344, lt2Hr: 169, status: "Published", zonesSet: true },
  { id: "f08", name: "Marno Viljoen", sex: "M", dob: "2001-06-05", heightCm: 197, weightKg: 112, position: "Lock", experience: "7 years", goals: ["Lineout jumping power retained", "Contact recovery time"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 55.3, vo2Prev: 53.0, lt1Pace: 386, lt1PacePrev: 395, lt1Hr: 149, lt2Pace: 316, lt2PacePrev: 329, lt2Hr: 177, sweatRate: 1.7, sodium: 44, status: "Published", zonesSet: true },
  { id: "f09", name: "Kagiso Molefe", sex: "M", dob: "1998-09-03", heightCm: 198, weightKg: 114, position: "Lock", experience: "9 years", goals: ["Sustain lineout contests"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 52.7, vo2Prev: 52.7, lt1Pace: 394, lt1PacePrev: 396, lt1Hr: 147, lt2Pace: 322, lt2PacePrev: 320, lt2Hr: 175, status: "Published", zonesSet: true },
  { id: "f10", name: "Eben Joubert", sex: "M", dob: "2003-04-19", heightCm: 200, weightKg: 110, position: "Lock", experience: "3 years", goals: ["First baseline test"], tested: false, status: "Draft", zonesSet: false },
  { id: "f11", name: "Tshepo Dlamini", sex: "M", dob: "2000-10-25", heightCm: 189, weightKg: 102, position: "Blindside flanker", experience: "8 years", goals: ["Tackle workload management"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 54.5, vo2Prev: 53.8, lt1Pace: 384, lt1PacePrev: 389, lt1Hr: 150, lt2Pace: 310, lt2PacePrev: 318, lt2Hr: 176, sweatRate: 1.5, sodium: 39, status: "Published", zonesSet: true },
  { id: "f12", name: "Jaco Brand", sex: "M", dob: "1996-12-16", heightCm: 188, weightKg: 103, position: "Blindside flanker", experience: "11 years", goals: ["Reduce late-game fade"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 51.1, vo2Prev: 52.8, lt1Pace: 396, lt1PacePrev: 392, lt1Hr: 152, lt2Pace: 333, lt2PacePrev: 322, lt2Hr: 180, status: "Under review", zonesSet: false },
  { id: "f13", name: "Lunga Mbatha", sex: "M", dob: "2002-08-22", heightCm: 184, weightKg: 98, position: "Openside flanker", experience: "6 years", goals: ["Breakdown work rate"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 56.8, vo2Prev: 55.6, lt1Pace: 376, lt1PacePrev: 384, lt1Hr: 148, lt2Pace: 302, lt2PacePrev: 311, lt2Hr: 173, sweatRate: 1.9, sodium: 55, status: "Published", zonesSet: true },
  { id: "f14", name: "Riaan Steyn", sex: "M", dob: "1999-02-08", heightCm: 185, weightKg: 99, position: "Openside flanker", experience: "9 years", goals: ["Maintain ruck arrivals in extra time"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 53.9, vo2Prev: 53.7, lt1Pace: 390, lt1PacePrev: 393, lt1Hr: 149, lt2Pace: 320, lt2PacePrev: 326, lt2Hr: 176, status: "Published", zonesSet: true },
  { id: "f15", name: "Mduduzi Khoza", sex: "M", dob: "1998-05-18", heightCm: 189, weightKg: 107, position: "Number 8", experience: "7 years", goals: ["Ball carry repeatability"], tested: false, status: "Draft", zonesSet: false },
  { id: "f16", name: "Wiehan Botha", sex: "M", dob: "2001-01-12", heightCm: 190, weightKg: 108, position: "Number 8", experience: "6 years", goals: ["Sustain carry output"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 52.4, vo2Prev: 52.0, lt1Pace: 400, lt1PacePrev: 404, lt1Hr: 151, lt2Pace: 326, lt2PacePrev: 332, lt2Hr: 179, status: "Approved", zonesSet: true },
  // Backs
  { id: "b01", name: "Sipho Ngcobo", sex: "M", dob: "2001-03-09", heightCm: 172, weightKg: 78, position: "Scrumhalf", experience: "9 years", goals: ["Sub-maximal repeatability in the 10-min window"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 60.2, vo2Prev: 58.9, lt1Pace: 342, lt1PacePrev: 350, lt1Hr: 154, lt2Pace: 268, lt2PacePrev: 279, lt2Hr: 181, sweatRate: 1.4, sodium: 36, status: "Published", zonesSet: true },
  { id: "b02", name: "Liam Abrahams", sex: "M", dob: "2004-06-21", heightCm: 171, weightKg: 75, position: "Scrumhalf", experience: "5 years", goals: ["Pass under fatigue"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 58.3, vo2Prev: 58.0, lt1Pace: 350, lt1PacePrev: 352, lt1Hr: 152, lt2Pace: 276, lt2PacePrev: 272, lt2Hr: 180, status: "Published", zonesSet: true },
  { id: "b03", name: "Kabelo Maseko", sex: "M", dob: "2002-10-02", heightCm: 179, weightKg: 84, position: "Flyhalf", experience: "8 years", goals: ["Kicking load in the final 20 min"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 57.4, vo2Prev: 56.1, lt1Pace: 356, lt1PacePrev: 362, lt1Hr: 153, lt2Pace: 282, lt2PacePrev: 290, lt2Hr: 180, sweatRate: 1.5, sodium: 42, status: "Published", zonesSet: true },
  { id: "b04", name: "Stefan Muller", sex: "M", dob: "1999-12-30", heightCm: 180, weightKg: 85, position: "Flyhalf", experience: "10 years", goals: ["Game management across 80 min"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 56.9, vo2Prev: 57.2, lt1Pace: 352, lt1PacePrev: 351, lt1Hr: 155, lt2Pace: 288, lt2PacePrev: 287, lt2Hr: 182, status: "Published", zonesSet: true },
  { id: "b05", name: "Andile Mthembu", sex: "M", dob: "1998-04-14", heightCm: 184, weightKg: 94, position: "Inside centre", experience: "11 years", goals: ["Repeat high-speed efforts"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 59.0, vo2Prev: 57.1, lt1Pace: 344, lt1PacePrev: 356, lt1Hr: 151, lt2Pace: 272, lt2PacePrev: 286, lt2Hr: 178, sweatRate: 1.7, sodium: 48, status: "Published", zonesSet: true },
  { id: "b06", name: "Callum Rossouw", sex: "M", dob: "2003-07-07", heightCm: 185, weightKg: 93, position: "Inside centre", experience: "6 years", goals: ["Defensive line speed retention"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 58.8, vo2Prev: 58.6, lt1Pace: 348, lt1PacePrev: 347, lt1Hr: 153, lt2Pace: 279, lt2PacePrev: 281, lt2Hr: 181, status: "Under review", zonesSet: false },
  { id: "b07", name: "Themba Nkosi", sex: "M", dob: "1998-01-26", heightCm: 185, weightKg: 95, position: "Outside centre", experience: "10 years", goals: ["Maintain sprint output late in games"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 55.6, vo2Prev: 55.9, lt1Pace: 364, lt1PacePrev: 366, lt1Hr: 156, lt2Pace: 298, lt2PacePrev: 297, lt2Hr: 183, status: "Approved", zonesSet: true },
  { id: "b08", name: "Diego Visser", sex: "M", dob: "2001-09-14", heightCm: 186, weightKg: 92, position: "Outside centre", experience: "7 years", goals: ["Return to full training load"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 57.9, vo2Prev: 55.8, lt1Pace: 346, lt1PacePrev: 358, lt1Hr: 150, lt2Pace: 274, lt2PacePrev: 289, lt2Hr: 177, sweatRate: 1.6, sodium: 51, status: "Published", zonesSet: true },
  { id: "b09", name: "Lwazi Tshabalala", sex: "M", dob: "2005-02-17", heightCm: 180, weightKg: 83, position: "Wing", experience: "4 years", goals: ["Top-speed endurance"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 61.8, vo2Prev: 60.9, lt1Pace: 332, lt1PacePrev: 338, lt1Hr: 152, lt2Pace: 258, lt2PacePrev: 266, lt2Hr: 178, sweatRate: 1.3, sodium: 33, status: "Published", zonesSet: true },
  { id: "b10", name: "Gift Shabangu", sex: "M", dob: "2002-11-03", heightCm: 181, weightKg: 84, position: "Wing", experience: "8 years", goals: ["Repeat sprint ability in the second half"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 60.5, vo2Prev: 60.0, lt1Pace: 336, lt1PacePrev: 340, lt1Hr: 154, lt2Pace: 262, lt2PacePrev: 264, lt2Hr: 181, status: "Published", zonesSet: true },
  { id: "b11", name: "Ethan Pillay", sex: "M", dob: "2003-05-28", heightCm: 178, weightKg: 80, position: "Wing", experience: "5 years", goals: ["First baseline test"], tested: false, status: "Draft", zonesSet: false },
  { id: "b12", name: "Retief Kruger", sex: "M", dob: "1997-08-09", heightCm: 182, weightKg: 88, position: "Fullback", experience: "12 years", goals: ["Kick-chase recovery"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 57.1, vo2Prev: 58.4, lt1Pace: 350, lt1PacePrev: 347, lt1Hr: 155, lt2Pace: 286, lt2PacePrev: 278, lt2Hr: 184, sweatRate: 1.8, sodium: 58, status: "Published", zonesSet: true },
  { id: "b13", name: "Ayabonga Gcaleka", sex: "M", dob: "2000-03-15", heightCm: 181, weightKg: 86, position: "Fullback", experience: "7 years", goals: ["Defensive re-set speed"], tested: true, lastTest: "2026-09-12", prevTest: "2026-03-14", vo2: 58.6, vo2Prev: 58.0, lt1Pace: 340, lt1PacePrev: 346, lt1Hr: 152, lt2Pace: 266, lt2PacePrev: 274, lt2Hr: 179, status: "Published", zonesSet: true },
  { id: "b14", name: "Jordan Peters", sex: "M", dob: "2006-01-06", heightCm: 179, weightKg: 82, position: "Fullback", experience: "2 years", goals: ["First baseline test"], tested: false, status: "Draft", zonesSet: false },
];

// Demo assessments. Coach-entered, labelled as such in the UI. Never derived from test values.
const ASSESS: Record<string, { rest: Assessment<RestStatus>; peaking: Assessment<PeakingStatus> }> = {
  f01: { rest: { status: "Green", assessedOn: "2026-10-19" }, peaking: { status: "Building", assessedOn: "2026-10-19" } },
  f02: { rest: { status: "Green", assessedOn: "2026-10-19" }, peaking: { status: "Maintaining", assessedOn: "2026-10-19" } },
  f03: { rest: { status: "Green", assessedOn: "2026-10-19" }, peaking: { status: "Potentially approaching peak", assessedOn: "2026-10-19" } },
  f04: { rest: { status: "Grey", note: "No recovery check-in this week" }, peaking: { status: "Insufficient data" } },
  f05: { rest: { status: "Green", assessedOn: "2026-10-18" }, peaking: { status: "Building", assessedOn: "2026-10-18" } },
  f06: { rest: { status: "Amber", assessedOn: "2026-10-19", note: "Reported heavy scrum load this week" }, peaking: { status: "Maintaining", assessedOn: "2026-10-19" } },
  f07: { rest: { status: "Green", assessedOn: "2026-10-17" }, peaking: { status: "Maintaining", assessedOn: "2026-10-17" } },
  f08: { rest: { status: "Green", assessedOn: "2026-10-19" }, peaking: { status: "Potentially approaching peak", assessedOn: "2026-10-19" } },
  f09: { rest: { status: "Green", assessedOn: "2026-10-19" }, peaking: { status: "Maintaining", assessedOn: "2026-10-19" } },
  f10: { rest: { status: "Grey" }, peaking: { status: "Insufficient data" } },
  f11: { rest: { status: "Amber", assessedOn: "2026-10-18", note: "Coach-observed fatigue after two match days" }, peaking: { status: "Maintaining", assessedOn: "2026-10-18" } },
  f12: { rest: { status: "Red", assessedOn: "2026-10-20", note: "Flagged for further assessment by physio; not a medical finding" }, peaking: { status: "Building", assessedOn: "2026-10-20" } },
  f13: { rest: { status: "Green", assessedOn: "2026-10-19" }, peaking: { status: "Potentially approaching peak", assessedOn: "2026-10-19" } },
  f14: { rest: { status: "Green", assessedOn: "2026-10-19" }, peaking: { status: "Maintaining", assessedOn: "2026-10-19" } },
  f15: { rest: { status: "Grey" }, peaking: { status: "Insufficient data" } },
  f16: { rest: { status: "Amber", assessedOn: "2026-10-19", note: "Sleep reported low twice this week" }, peaking: { status: "Building", assessedOn: "2026-10-19" } },
  b01: { rest: { status: "Green", assessedOn: "2026-10-19" }, peaking: { status: "Competition ready — coach assessed", assessedOn: "2026-10-19" } },
  b02: { rest: { status: "Green", assessedOn: "2026-10-19" }, peaking: { status: "Potentially approaching peak", assessedOn: "2026-10-19" } },
  b03: { rest: { status: "Green", assessedOn: "2026-10-18" }, peaking: { status: "Building", assessedOn: "2026-10-18" } },
  b04: { rest: { status: "Green", assessedOn: "2026-10-18" }, peaking: { status: "Maintaining", assessedOn: "2026-10-18" } },
  b05: { rest: { status: "Green", assessedOn: "2026-10-19" }, peaking: { status: "Potentially approaching peak", assessedOn: "2026-10-19" } },
  b06: { rest: { status: "Amber", assessedOn: "2026-10-19", note: "Minor niggle reported, managed by physio" }, peaking: { status: "Maintaining", assessedOn: "2026-10-19" } },
  b07: { rest: { status: "Green", assessedOn: "2026-10-19" }, peaking: { status: "Tapering", assessedOn: "2026-10-19" } },
  b08: { rest: { status: "Green", assessedOn: "2026-10-19" }, peaking: { status: "Building", assessedOn: "2026-10-19" } },
  b09: { rest: { status: "Green", assessedOn: "2026-10-19" }, peaking: { status: "Potentially approaching peak", assessedOn: "2026-10-19" } },
  b10: { rest: { status: "Green", assessedOn: "2026-10-19" }, peaking: { status: "Maintaining", assessedOn: "2026-10-19" } },
  b11: { rest: { status: "Grey" }, peaking: { status: "Insufficient data" } },
  b12: { rest: { status: "Green", assessedOn: "2026-10-19" }, peaking: { status: "Tapering", assessedOn: "2026-10-19" } },
  b13: { rest: { status: "Red", assessedOn: "2026-10-20", note: "Coach flagged for rest after training-load review" }, peaking: { status: "Maintaining", assessedOn: "2026-10-20" } },
  b14: { rest: { status: "Grey" }, peaking: { status: "Insufficient data" } },
};

const PROTOCOL_LT = "Incremental treadmill, 4 min stages, 1.0 km/h steps, capillary lactate at stage end (demo)";
const PROTOCOL_VO2 = "Incremental treadmill to exhaustion, breath-by-breath gas analysis (demo)";
const PROTOCOL_SWEAT = "Patch sweat test, 60 min run at fixed intensity, ambient conditions logged (demo)";

function makeTests(a: Omit<Athlete, "tests" | "rest" | "peaking">): TestRecord[] {
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

export const ATHLETES: Athlete[] = RAW.map((a) => ({
  ...a,
  tests: makeTests(a),
  rest: ASSESS[a.id].rest,
  peaking: ASSESS[a.id].peaking,
}));

// Fictional fixtures (demo dates only).
export interface Fixture {
  date: string;
  opponent: string;
  venue: "Home" | "Away";
  competition: string;
}
export const FIXTURES: Fixture[] = [
  { date: "2026-10-31", opponent: "Northern Ridge RFC (fictional)", venue: "Home", competition: "Demo League · Round 7" },
  { date: "2026-11-07", opponent: "Harbour Town XV (fictional)", venue: "Away", competition: "Demo League · Round 8" },
  { date: "2026-11-14", opponent: "Mountain Sevens (fictional)", venue: "Home", competition: "Demo Cup · Quarter-final" },
  { date: "2026-11-28", opponent: "Coastal Barbarians (fictional)", venue: "Away", competition: "Demo League · Round 9" },
];
export const PLANNED_TESTS: { date: string; label: string }[] = [
  { date: "2026-11-16", label: "Squad lactate and VO₂max block (fictional)" },
  { date: "2027-01-18", label: "Mid-season sweat testing (fictional)" },
];

export const GROUP_FILTERS = ["All athletes", "Forwards", "Backs", ...POSITIONS] as const;
export type GroupFilter = (typeof GROUP_FILTERS)[number];

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

export function daysUntil(iso: string) {
  return Math.round((new Date(iso + "T00:00:00").getTime() - new Date(TODAY + "T00:00:00").getTime()) / 86400000);
}

// ---------- derived values ----------

export const RETEST_AFTER_DAYS = 120; // practitioner-set default; due when last test is older than this

export function isDueForRetest(a: Athlete) {
  return a.tested && daysSince(a.lastTest) > RETEST_AFTER_DAYS;
}

export function groupOf(a: Athlete): PositionGroup {
  return POSITION_GROUP[a.position];
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

export function restTone(s: RestStatus) {
  return { Green: "accent", Amber: "ochre", Red: "clay", Grey: "stone" }[s] as "accent" | "ochre" | "clay" | "stone";
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

// Average of a measured value across a group. Suppressed when fewer than MIN_GROUP_N athletes have it.
export function groupAvg<T>(list: T[], pick: (a: T) => number | undefined) {
  const xs = list.map(pick).filter((x): x is number => x !== undefined);
  const n = xs.length;
  return {
    n,
    value: n >= MIN_GROUP_N ? xs.reduce((s, x) => s + x, 0) / n : undefined,
  };
}

export function teamStats(list: Athlete[]) {
  const tested = list.filter((a) => a.tested);
  return {
    total: list.length,
    tested: tested.length,
    completion: list.length ? Math.round((tested.length / list.length) * 100) : 0,
    vo2: groupAvg(list, (a) => a.vo2),
    lt1Hr: groupAvg(list, (a) => a.lt1Hr),
    lt2Hr: groupAvg(list, (a) => a.lt2Hr),
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

export function filterAthletes(list: Athlete[], f: GroupFilter) {
  if (f === "All athletes") return list;
  if (f === "Forwards" || f === "Backs") return list.filter((a) => groupOf(a) === f);
  return list.filter((a) => a.position === f);
}

export function paceText(a: Athlete, which: "lt1" | "lt2") {
  const p = which === "lt1" ? a.lt1Pace : a.lt2Pace;
  const hr = which === "lt1" ? a.lt1Hr : a.lt2Hr;
  if (!a.tested) return "Not tested";
  if (p === undefined) return "—";
  return `${fmtPace(p)}/km · ${hr ?? "—"} bpm`;
}

// Position-specific interpretation (demo copy, practitioner review required before use).
export function interpretation(a: Athlete) {
  const gap = a.lt1Pace && a.lt2Pace ? a.lt1Pace - a.lt2Pace : undefined;
  const lines: string[] = [];
  if (groupOf(a) === "Forwards") {
    lines.push("Forwards profile: repeated contact and scrum work load the aerobic system between bursts; recovery between efforts matters more than peak speed.");
  } else {
    lines.push("Backs profile: high-speed repeatability and LT2 pace carry the most weight; keep aerobic base sessions to protect recovery.");
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

// ---------- assessment categories ----------

export const REST_STATUSES: RestStatus[] = ["Red", "Amber", "Green", "Grey"];
export const PEAKING_STATUSES: PeakingStatus[] = [
  "Competition ready — coach assessed",
  "Potentially approaching peak",
  "Tapering",
  "Building",
  "Maintaining",
  "Insufficient data",
];
export const REST_SHORT: Record<RestStatus, string> = { Green: "Green", Amber: "Amber", Red: "Red", Grey: "Grey" };
export const REST_COLOR: Record<RestStatus, string> = { Green: "#2f5d46", Amber: "#b9793a", Red: "#b3412b", Grey: "#9a9e98" };

export function peakTone(s: PeakingStatus): "accent" | "ochre" | "clay" | "stone" {
  if (s === "Competition ready — coach assessed" || s === "Potentially approaching peak") return "accent";
  if (s === "Tapering") return "ochre";
  if (s === "Insufficient data") return "stone";
  return "stone";
}

// ---------- testing periods (block-level comparisons) ----------

export const BLOCKS = { sep: "2026-09-12", mar: "2026-03-14" } as const;

export interface PeriodValues {
  vo2?: number;
  lt1Pace?: number;
  lt1Hr?: number;
  lt2Pace?: number;
  lt2Hr?: number;
  sweatRate?: number;
}

// Values for one testing period. Only the same squad session counts as one block, so athletes tested on other dates are excluded.
// Heart rate and sweat data were not kept for the March block in this demo, so they return undefined (shown as "—").
export function periodValues(a: Athlete, period: "Latest result" | "Sep 2026 block" | "Mar 2026 block"): PeriodValues | undefined {
  if (!a.tested) return undefined;
  if (period === "Latest result") return a;
  if (period === "Sep 2026 block") return a.lastTest === BLOCKS.sep ? a : undefined;
  if (a.prevTest !== BLOCKS.mar) return undefined;
  return { vo2: a.vo2Prev, lt1Pace: a.lt1PacePrev, lt2Pace: a.lt2PacePrev };
}

export interface TestSession {
  date: string;
  label: string;
  athletes: Athlete[];
}

// Recent sessions derived from athletes' latest test dates, newest first.
export function recentSessions(list: Athlete[]): TestSession[] {
  const by = new Map<string, Athlete[]>();
  list.forEach((a) => {
    if (!a.lastTest) return;
    by.set(a.lastTest, [...(by.get(a.lastTest) ?? []), a]);
  });
  return [...by.entries()]
    .sort((x, y) => (x[0] < y[0] ? 1 : -1))
    .map(([date, athletes]) => ({
      date,
      athletes,
      label: athletes.length >= 5 ? "Squad lactate + VO₂max block" : "Individual test",
    }));
}
