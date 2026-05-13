"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const urlSchema = z.object({
  url: z.string().url("Invalid URL"),
});

export default function EditLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState<string>("");

  useEffect(() => {
    void (async () => {
      const { id: resolvedId } = await params;
      setId(resolvedId);
    })();
  }, [params]);

  const form = useForm<z.infer<typeof urlSchema>>({
    resolver: zodResolver(urlSchema),
    defaultValues: {
      url: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof urlSchema>) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/me/links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: values.url }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to update link");
        return;
      }

      router.push(`/dashboard/${id}`);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Edit: {id}</h1>
        </div>

        {error && (
          <div className="p-3 text-sm bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Link href={`/dashboard/${id}`}>
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
