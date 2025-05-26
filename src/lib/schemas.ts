import { z } from "zod";

export const createLinkSchema = z.object({
  url: z
    .string()
    .url("The URL is incorrect.")
    .max(512, "The URL is too long (even for the shortener)."),
  turnstileToken: z.string().min(1, "Please complete the captcha"),
});
