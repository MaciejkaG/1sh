"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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

export function CreateLinkForm({
  handleSubmit,
}: {
  handleSubmit: (values: z.infer<typeof createLinkSchema>) => void;
}): React.JSX.Element {
  const form = useForm<z.infer<typeof createLinkSchema>>({
    resolver: zodResolver(createLinkSchema),
    defaultValues: {
      url: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="w-sm mx-auto">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your long URL</FormLabel>
              <div className="flex gap-2">
                <FormControl className="flex-1">
                  <Input placeholder="https://1sh.pl/" {...field} />
                </FormControl>
                <Button type="submit">Shorten</Button>
              </div>
              <FormDescription>
                After you press &quot;Shorten&quot;, you will receive a
                shortened version of the provided URL.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
