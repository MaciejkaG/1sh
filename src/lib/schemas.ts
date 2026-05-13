import { z } from "zod";

export const createLinkSchema = z.object({
  url: z.string().url("The URL is incorrect.").max(2048),
  turnstileToken: z.string().min(1, "Please complete the captcha"),
  customSlug: z.string().regex(/^[A-Za-z0-9_-]{3,32}$/, "3–32 chars: letters, digits, _ or -").optional().or(z.literal("")),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const signUpSchema = signInSchema.extend({
  name: z.string().min(2).max(64),
});

export const blacklistAddSchema = z.object({
  pattern: z.string().min(3).max(255),
  reason: z.string().max(500).optional(),
});
