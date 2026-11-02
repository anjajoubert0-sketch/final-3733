import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { runableManagedAuth } from "@runablehq/managed-auth/server";
import { autumn } from "autumn-js/better-auth";
import { Autumn } from "autumn-js";
import { db } from "./database";
import { userProfiles } from "./database/app-schema";

// Roles are NOT part of the Better Auth user record, so a sign-up request can never set one.
// Every new account starts with role = null and picks Coach or Individual in onboarding.
// Practitioner is only granted by an admin (approved request) or a practitioner invite.
export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: process.env.WEBSITE_URL,
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: (request) => {
    const origin = request?.headers.get("origin");
    return origin ? [origin] : ["*"];
  },
  plugins: [
    ...runableManagedAuth({
      applicationId: process.env.APPLICATION_ID!,
      issuer: process.env.VITE_RUNABLE_AUTH_ISSUER!,
    }),
    // Card checkout for testing bookings (off until an admin sets a price). Subscriptions are trials only.
    autumn(),
  ],
  databaseHooks: {
    user: {
      create: {
        async after(user) {
          await db
            .insert(userProfiles)
            .values({ userId: user.id, role: null, isAdmin: false, onboarding: "role", displayName: user.name, createdAt: Date.now() })
            .onConflictDoNothing();
          if (user.email.endsWith(".test")) return; // fictional demo accounts never become Autumn customers
          try {
            await new Autumn().customers.getOrCreate({ customerId: user.id, name: user.name, email: user.email });
          } catch (e) {
            console.error("[autumn] Failed to create customer on sign-up:", e);
          }
        },
      },
    },
  },
});
