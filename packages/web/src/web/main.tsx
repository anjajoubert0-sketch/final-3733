// Entry point referenced by index.html — composition only, real bootstrap
// lives in __main.tsx (template-managed).
import { authClient } from "./lib/auth";

// Completes a returning managed (Google) sign-in before the app renders.
await authClient.managedAuth.handleRedirect();
await import("./__main");
