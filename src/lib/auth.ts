import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/client";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: { enabled: true, autoSignIn: true },
  socialProviders: process.env.GITHUB_CLIENT_ID
    ? {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID!,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        },
      }
    : undefined,
  user: { additionalFields: { role: { type: "string", defaultValue: "user", input: false } } },
  trustedOrigins: [process.env.BETTER_AUTH_URL!].filter(Boolean),
});

export type Session = typeof auth.$Infer.Session;
