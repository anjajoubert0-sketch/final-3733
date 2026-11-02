import { createAuthClient } from "better-auth/react";
import { managedAuthClient } from "@runablehq/managed-auth/client";

// Both values are injected into the app env and exposed to the browser by Vite.
export const authClient = createAuthClient({
  // Packaged desktop builds load from file://, so the page origin is not the server there.
  baseURL: import.meta.env.VITE_WEBSITE_URL ?? window.location.origin,
  basePath: "/api/auth",
  plugins: [
    managedAuthClient({
      applicationId: import.meta.env.VITE_APPLICATION_ID ?? "",
      issuer: import.meta.env.VITE_RUNABLE_AUTH_ISSUER ?? "",
    }),
  ],
});

// One token source for Google (managed) and email/password sign-in.
const TOKEN_KEY = "runable.managed-auth.token";

/** fetchOptions for email sign-in / sign-up: stores the bearer the server returns. */
export const storeBearer = {
  onSuccess: (ctx: { response: Response }) => {
    const token = ctx.response.headers.get("set-auth-token");
    if (token) {
      try {
        localStorage.setItem(TOKEN_KEY, token);
      } catch {
        /* storage blocked: session falls back to cookies */
      }
    }
  },
};

export async function signOut() {
  try {
    await authClient.signOut();
  } finally {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** Google sign-in. Returns an error message, or null (also when the user closed the popup). */
export async function signInWithGoogle(): Promise<string | null> {
  const result = await authClient.managedAuth.signIn({ provider: "google" });
  if (result.error && result.error.code !== "POPUP_CLOSED") return result.error.message ?? "Google sign-in failed.";
  return null;
}
