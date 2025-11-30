"use client";

import { CreateLinkForm } from "@/components/CreateLinkForm";
import { LinkManagementDashboard } from "@/components/LinkManagementDashboard";
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
  const [copied, setCopied] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (values: z.infer<typeof createLinkSchema>) => {
    if (isSubmitting) return { success: false };

    try {
      setIsSubmitting(true);
      const res: AxiosResponse = await ax.post("/link", values);

      setResultLink(`${process.env.NEXT_PUBLIC_API_URL}/${res.data.data.id}`);

      return {
        success: true,
        data: {
          id: res.data.data.id,
          shortUrl: `${process.env.NEXT_PUBLIC_API_URL}/${res.data.data.id}`,
          managementToken: res.data.data.managementToken,
          customAlias: res.data.data.customAlias,
        },
      };
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        // Show the error as a red text below the form.
        setCreateError(`Error: ${err.status} - ${err.response?.data?.error}`);
        setTimeout(() => {
          setCreateError(null);
        }, 5000);
      }

      return { success: false };
    } finally {
      setIsSubmitting(false);
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
    <div className="container mx-auto mt-4">
      {/* Header section */}
      <div className="text-center mb-8">
        <h1 className="font-black italic text-2xl">1sh</h1>
        <p>The URL shortener.</p>
      </div>

      {/* Link creation form */}
      <div className="mb-8">
        <CreateLinkForm handleSubmit={handleSubmit} isSubmitting={isSubmitting} />
        
        {resultLink && (
          <div className="mx-auto px-2 mt-4 w-sm max-w-full space-y-2">
            <Label htmlFor="short-link">Your shortened link</Label>
            <div className="relative">
              <Input
                id="short-link"
                type="text"
                value={resultLink}
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
            </div>
          </div>
        )}
        
        {createError && (
          <div className="text-center mt-4">
            <p className="text-red-400">{createError}</p>
          </div>
        )}
      </div>

      {/* Link management dashboard */}
      <div className="mx-auto max-w-5xl border-t pt-8">
        <LinkManagementDashboard />
      </div>
    </div>
  );
}
