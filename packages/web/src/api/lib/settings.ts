import { eq } from "drizzle-orm";
import { db } from "../database";
import { appSettings } from "../database/app-schema";

export interface PricingSettings {
  /** Price per athlete per test, in cents. null = "to be confirmed" (card checkout off). */
  testPriceCents: number | null;
  currency: string;
}
export interface TrialSettings {
  /** Trial length in days. null = open until prices are set. */
  trialDays: number | null;
}
export interface Thresholds {
  vo2: number;
  lt2: number;
}

const DEFAULTS = {
  pricing: { testPriceCents: null, currency: "ZAR" } as PricingSettings,
  trial: { trialDays: null } as TrialSettings,
  thresholds: { vo2: 1.0, lt2: 3 } as Thresholds,
};
type Key = keyof typeof DEFAULTS;

export async function getSetting<K extends Key>(key: K): Promise<(typeof DEFAULTS)[K]> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return { ...DEFAULTS[key], ...((row?.value as object) ?? {}) } as (typeof DEFAULTS)[K];
}

export async function setSetting<K extends Key>(key: K, value: (typeof DEFAULTS)[K], userId: string | null) {
  await db
    .insert(appSettings)
    .values({ key, value, updatedBy: userId, updatedAt: Date.now() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedBy: userId, updatedAt: Date.now() } });
}

export async function ensureSetting<K extends Key>(key: K) {
  await db.insert(appSettings).values({ key, value: DEFAULTS[key], updatedBy: null, updatedAt: Date.now() }).onConflictDoNothing();
}
