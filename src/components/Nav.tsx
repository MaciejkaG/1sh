"use client";

import { useSession, signOut } from "@/lib/auth-client";
import Link from "next/link";
import { Button } from "./ui/button";

export function Nav() {
  const { data: session } = useSession();

  if (session) {
    return (
      <nav className="flex items-center justify-end gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            Dashboard
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut()}
        >
          Sign out
        </Button>
      </nav>
    );
  }

  return (
    <nav className="flex items-center justify-end gap-4">
      <Link href="/login">
        <Button variant="ghost" size="sm">
          Sign in
        </Button>
      </Link>
      <Link href="/register">
        <Button size="sm">
          Create account
        </Button>
      </Link>
    </nav>
  );
}
