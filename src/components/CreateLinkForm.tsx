"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Turnstile from "react-turnstile";
import {
  Form,
  FormField,
  FormLabel,
  FormItem,
  FormControl,
  FormDescription,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { createLinkSchema } from "@/lib/schemas";
import { Link } from "./ui/link";
import { Loader2Icon } from "lucide-react";
import { useRef } from "react";
import { useSession } from "@/lib/auth-client";

export function CreateLinkForm({
  handleSubmit,
  isSubmitting,
  sitekey,
}: {
  handleSubmit: (values: z.infer<typeof createLinkSchema>) => Promise<boolean>;
  isSubmitting: boolean;
  sitekey: string;
}): React.JSX.Element {
  const { data: session } = useSession();

  const form = useForm<z.infer<typeof createLinkSchema>>({
    resolver: zodResolver(createLinkSchema),
    defaultValues: {
      url: "",
      turnstileToken: "",
      customSlug: "",
    },
  });

  const widgetIdRef = useRef<string | null>(null);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(
          async (values: z.infer<typeof createLinkSchema>) => {
            const res = await handleSubmit(values);
            if (widgetIdRef.current) {
              (
                window as Window &
                  typeof globalThis & {
                    turnstile: { reset: (id: string) => void };
                  }
              ).turnstile.reset(widgetIdRef.current);
            }
            if (res) {
              form.reset();
            }
          }
        )}
        className="w-sm max-w-full px-2 mx-auto space-y-4"
      >
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your long URL</FormLabel>
              <div className="flex gap-2">
                <FormControl className="flex-1">
                  <Input placeholder="https://example.com/" {...field} />
                </FormControl>
                {/* eslint-disable-next-line react-hooks/incompatible-library */}
                <Button type="submit" disabled={!form.watch("turnstileToken")}>
                  {isSubmitting ? (
                    <Loader2Icon className="w-4 h-4" />
                  ) : (
                    <>Shorten</>
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {session && (
          <FormField
            control={form.control}
            name="customSlug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom slug (optional)</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">1sh.pl/</span>
                    <Input placeholder="myslug" className="flex-1" {...field} />
                  </div>
                </FormControl>
                <FormDescription>3–32 chars: letters, digits, _ or -</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="turnstileToken"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Turnstile
                  sitekey={sitekey}
                  onVerify={(token: string) => {
                    field.onChange(token);
                  }}
                  onError={() => {
                    field.onChange("");
                  }}
                  onExpire={() => {
                    field.onChange("");
                  }}
                  onLoad={(widgetId: string) => {
                    widgetIdRef.current = widgetId;
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormDescription>
          By pressing &quot;Shorten&quot;, you accept our{" "}
          <Link href="/terms">Terms</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </FormDescription>
      </form>
    </Form>
  );
}
