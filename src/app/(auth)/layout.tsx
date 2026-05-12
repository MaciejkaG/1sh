"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (session) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-sm px-4">
        {children}
      </div>
    </div>
  );
}
