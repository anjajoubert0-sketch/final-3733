import type { RouterClient } from "@orpc/server";
import { createApp } from "./__core/app";
import { auth } from "./auth";
import { ping } from "./routes/ping";
import { me } from "./routes/me";
import { adminRouter } from "./routes/admin";
import { invitesRouter } from "./routes/invites";
import { teamsRouter } from "./routes/teams";
import { squad } from "./routes/squad";
import { testsRouter } from "./routes/tests";
import { bookingsRouter } from "./routes/bookings";
import { trainingRouter } from "./routes/training";
import { plansRouter } from "./routes/plans";
import { practitionerRouter } from "./routes/practitioner";

// API features are oRPC procedures, one file per feature in ./routes/,
// composed into this router — typed end-to-end via the clients
// (web: src/web/lib/api.ts, mobile: lib/api.ts).
// Keep each routes/ file under 500 lines (`bun run lint` enforces this);
// split into more feature files as they grow.
// Patterns and examples: skills/app/references/api.md
export const router = {
  ping,
  me,
  admin: adminRouter,
  invites: invitesRouter,
  teams: teamsRouter,
  squad,
  tests: testsRouter,
  bookings: bookingsRouter,
  training: trainingRouter,
  plans: plansRouter,
  practitioner: practitionerRouter,
};

export type AppRouter = typeof router;
/** Typed client for the router — used by the web and mobile api clients. */
export type AppRouterClient = RouterClient<AppRouter>;

const app = createApp(router);
// Rare plain-HTTP endpoints (webhooks, streaming, the Better Auth handler)
// register here with full paths, e.g. app.post("/api/webhooks/example", ...)
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

export default app;
