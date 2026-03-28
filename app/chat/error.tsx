"use client";

import { useEffect } from "react";

import { AppErrorState } from "@/components/app-error-state";

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Chat route error", error);
  }, [error]);

  return (
    <AppErrorState
      title="Text support needs a fresh start"
      message="The text support page ran into a browser issue. You can retry now or go back to the AI call while we keep the experience stable."
      onRetry={reset}
      primaryHref="/"
      primaryLabel="Back to the AI call"
    />
  );
}
