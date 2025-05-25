"use client";

import { CreateLinkForm } from "@/components/CreateLinkForm";
import ax from "@/lib/ax";
import {z} from "zod";
import { createLinkSchema } from "@/lib/schemas";
import { useState } from "react";
import { AxiosError, AxiosResponse } from "axios";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function Home(): React.JSX.Element {
  const [createError, setCreateError] = useState<string | null>(null);

  const [resultLink, setResultLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (values: z.infer<typeof createLinkSchema>) => {
    try {
      const res: AxiosResponse = await ax.post("/link", { url: values.url });

      setResultLink(`${process.env.NEXT_PUBLIC_API_URL}/${res.data.id}`);
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        // Show the error as a red text below the form.
        setCreateError(`Error: ${err.status} - ${err.response?.data?.error}`);
        setTimeout(() => {
          setCreateError(null);
        }, 5000);
      }
    }
  };

  const copyToClipboard = async () => {
    try {
      if (typeof resultLink === "string") {
        await navigator.clipboard.writeText(resultLink);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="container mx-auto mt-4 text-center">
      <h1 className="font-black text-2xl">1sh</h1>
      <p>The URL shortener.</p>
      <CreateLinkForm handleSubmit={handleSubmit} />
      {resultLink && (
        <div className="mx-auto mt-4 w-sm space-y-2">
          <Label htmlFor="short-link">Your shortened link</Label>
          <div className="relative">
            <Input
              id="short-link"
              type="text"
              value={resultLink}
              // disabled
              readOnly
              className="flex h-12 w-full cursor-default"
            />
            <Button
              onClick={copyToClipboard}
              title={copied ? "Copied!" : "Copy to clipboard"}
              variant="ghost"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
            >
              {copied ? (
                <CheckIcon className="h-4 w-4 text-green-500" />
              ) : (
                <CopyIcon className="h-4 w-4 text-gray-500" />
              )}
            </Button>
            {/* {copied && (
              <p className="text-sm text-green-600 font-medium">
                Copied to clipboard!
              </p>
            )} */}
          </div>
        </div>
      )}
      {createError && <p className="text-red-400">{createError}</p>}
    </div>
  );
}
