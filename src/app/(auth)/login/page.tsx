"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { signIn } from "@/lib/auth-client";
import { signInSchema } from "@/lib/schemas";
import { z } from "zod";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Github } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGitHub = async () => {
    setGithubLoading(true);
    setError(null);
    try {
      await signIn.social({ provider: "github", callbackURL: "/dashboard" });
    } catch {
      setError("GitHub sign in failed");
      setGithubLoading(false);
    }
  };

  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof signInSchema>) => {
    setIsLoading(true);
    setError(null);

    try {
      await signIn.email(
        {
          email: values.email,
          password: values.password,
        },
        {
          onSuccess: () => {
            router.push("/dashboard");
          },
          onError: (ctx) => {
            setError(ctx.error.message || "Sign in failed");
          },
        }
      );
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and password to sign in to your account
        </p>
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="name@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or continue with</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGitHub}
        disabled={githubLoading}
      >
        <Github className="mr-2 h-4 w-4" />
        {githubLoading ? "Redirecting..." : "GitHub"}
      </Button>

      <div className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}
