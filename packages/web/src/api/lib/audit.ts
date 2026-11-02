import { db } from "../database";
import { testAudit } from "../database/app-schema";
import { newId, type Actor } from "./access";

type Json = Record<string, unknown>;

/** Field-by-field diff: only keys whose value changed, flattened one level (results.vo2, etc). */
export function diff(before: Json | null, after: Json | null) {
  const flat = (o: Json | null) => {
    const out: Json = {};
    if (!o) return out;
    for (const [k, v] of Object.entries(o)) {
      if (v && typeof v === "object" && !Array.isArray(v) && k !== "stages") {
        for (const [k2, v2] of Object.entries(v as Json)) out[`${k}.${k2}`] = v2;
      } else out[k] = v;
    }
    return out;
  };
  const b = flat(before);
  const a = flat(after);
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const changedBefore: Json = {};
  const changedAfter: Json = {};
  for (const k of keys) {
    if (JSON.stringify(b[k] ?? null) !== JSON.stringify(a[k] ?? null)) {
      changedBefore[k] = b[k] ?? null;
      changedAfter[k] = a[k] ?? null;
    }
  }
  return { before: changedBefore, after: changedAfter };
}

const AUDITED = ["type", "date", "protocol", "equipment", "results", "stages", "analysis", "zonesSet", "status", "paymentStatus", "publishedAt"] as const;

export function auditable(t: Json | null): Json | null {
  if (!t) return null;
  const out: Json = {};
  for (const k of AUDITED) if (k in t) out[k] = k === "stages" ? (Array.isArray(t[k]) ? `${(t[k] as unknown[]).length} stages` : null) : t[k];
  return out;
}

export async function writeAudit(opts: { testId: string; actor: Actor; action: string; before: Json | null; after: Json | null; reason?: string | null }) {
  const d = diff(auditable(opts.before), auditable(opts.after));
  await db.insert(testAudit).values({
    id: newId("au_"),
    testId: opts.testId,
    userId: opts.actor.id,
    userName: opts.actor.name,
    action: opts.action,
    before: d.before,
    after: d.after,
    reason: opts.reason ?? null,
    at: Date.now(),
  });
}
