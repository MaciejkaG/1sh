"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, CheckIcon, XIcon, Loader2Icon } from "lucide-react";
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
import { Calendar } from "./ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { createLinkSchema } from "@/lib/schemas";
import { getTokenManager } from "@/lib/token-manager";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";

// Types for alias availability checking
interface AliasAvailabilityResponse {
  success: boolean;
  data?: {
    alias: string;
    available: boolean;
    message: string;
  };
  error?: string;
}

interface CreateLinkResponse {
  success: boolean;
  data?: {
    id: string;
    shortUrl: string;
    managementToken: string;
    customAlias?: string;
  };
  error?: string;
}

export function CreateLinkForm({
  handleSubmit,
  isSubmitting,
}: {
  handleSubmit: (values: z.infer<typeof createLinkSchema>) => Promise<CreateLinkResponse>;
  isSubmitting: boolean;
}): React.JSX.Element {
  const form = useForm<z.infer<typeof createLinkSchema>>({
    resolver: zodResolver(createLinkSchema),
    defaultValues: {
      url: "",
      customAlias: "",
      expiresAt: "",
      turnstileToken: "",
    },
  });

  const widgetIdRef = useRef<string | null>(null);
  const [aliasCheckState, setAliasCheckState] = useState<{
    isChecking: boolean;
    isAvailable: boolean | null;
    lastCheckedAlias: string;
  }>({
    isChecking: false,
    isAvailable: null,
    lastCheckedAlias: "",
  });

  // Debounced alias availability checking
  const checkAliasAvailability = useCallback(
    async (alias: string) => {
      if (!alias || alias.length < 3) {
        setAliasCheckState({
          isChecking: false,
          isAvailable: null,
          lastCheckedAlias: alias,
        });
        return;
      }

      // Don't check if it's the same alias we just checked
      if (alias === aliasCheckState.lastCheckedAlias && aliasCheckState.isAvailable !== null) {
        return;
      }

      setAliasCheckState(prev => ({
        ...prev,
        isChecking: true,
        lastCheckedAlias: alias,
      }));

      try {
        const response = await fetch('/api/v1/alias/availability', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ alias }),
        });

        const result: AliasAvailabilityResponse = await response.json();

        if (result.success && result.data) {
          setAliasCheckState({
            isChecking: false,
            isAvailable: result.data.available,
            lastCheckedAlias: alias,
          });
        } else {
          setAliasCheckState({
            isChecking: false,
            isAvailable: null,
            lastCheckedAlias: alias,
          });
        }
      } catch (error) {
        console.error('Error checking alias availability:', error);
        setAliasCheckState({
          isChecking: false,
          isAvailable: null,
          lastCheckedAlias: alias,
        });
      }
    },
    [aliasCheckState.lastCheckedAlias, aliasCheckState.isAvailable]
  );

  // Debounce alias checking
  useEffect(() => {
    const alias = form.watch("customAlias");
    if (!alias) {
      setAliasCheckState({
        isChecking: false,
        isAvailable: null,
        lastCheckedAlias: "",
      });
      return;
    }

    const timeoutId = setTimeout(() => {
      checkAliasAvailability(alias);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [form.watch("customAlias"), checkAliasAvailability]);

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
            if (res.success && res.data?.managementToken) {
              // Store management token in localStorage
              try {
                const tokenManager = getTokenManager();
                tokenManager.addToken(res.data.managementToken);
              } catch (error) {
                console.error('Error storing management token:', error);
              }
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
              <FormControl>
                <Input placeholder="https://example.com/" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customAlias"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custom alias (optional)</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input 
                    placeholder="my-custom-link" 
                    {...field}
                    className={cn(
                      "pr-8",
                      aliasCheckState.isAvailable === true && "border-green-500",
                      aliasCheckState.isAvailable === false && "border-red-500"
                    )}
                  />
                </FormControl>
                {field.value && field.value.length >= 3 && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {aliasCheckState.isChecking ? (
                      <Loader2Icon className="w-4 h-4 animate-spin text-gray-400" />
                    ) : aliasCheckState.isAvailable === true ? (
                      <CheckIcon className="w-4 h-4 text-green-500" />
                    ) : aliasCheckState.isAvailable === false ? (
                      <XIcon className="w-4 h-4 text-red-500" />
                    ) : null}
                  </div>
                )}
              </div>
              <FormDescription>
                {field.value && field.value.length >= 3 && aliasCheckState.isAvailable === false
                  ? "This alias is already taken. Try another one."
                  : field.value && field.value.length >= 3 && aliasCheckState.isAvailable === true
                  ? "This alias is available!"
                  : "Leave empty for a random short code. Only letters, numbers, hyphens, and underscores allowed."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expiresAt"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Expiration date (optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(new Date(field.value), "PPP")
                      ) : (
                        <span>Pick an expiration date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        // Set time to end of day to give full day access
                        const endOfDay = new Date(date);
                        endOfDay.setHours(23, 59, 59, 999);
                        field.onChange(endOfDay.toISOString());
                      } else {
                        field.onChange("");
                      }
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                Leave empty for permanent links. Expired links will automatically become inactive.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button 
            type="submit" 
            disabled={
              !form.watch("turnstileToken") || 
              isSubmitting ||
              (!!form.watch("customAlias") && aliasCheckState.isAvailable === false)
            }
            className="flex-1"
          >
            {isSubmitting ? (
              <Loader2Icon className="w-4 h-4 mr-2" />
            ) : null}
            Shorten
          </Button>
        </div>

        <FormField
          control={form.control}
          name="turnstileToken"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Turnstile
                  sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
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
  )
}
