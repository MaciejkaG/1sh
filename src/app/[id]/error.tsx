"use client";

import { Button } from "@/components/ui/button";

export default function ShortLinkError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}): React.JSX.Element {
  return (
    <div className="container mx-auto space-y-4 mt-4 text-center">
      <h1 className="font-black text-2xl">500</h1>
      <p>Something went wrong when figuring out the redirect.</p>
      <Button onClick={() => reset()} className="mx-auto">
        Try again?
      </Button>
    </div>
  );
}
