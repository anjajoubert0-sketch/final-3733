import { useSyncExternalStore } from "react";

// The coach's selected team (team switcher). Stored per browser; the server re-checks access on every call.
const KEY = "vad-active-team";
const listeners = new Set<() => void>();

function read() {
  try {
    return localStorage.getItem(KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function setActiveTeam(id: string | undefined) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: selection lasts for this page only */
  }
  listeners.forEach((l) => l());
}

export function useActiveTeamId() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => undefined,
  );
}
