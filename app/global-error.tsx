"use client";

import { useEffect } from "react";

import { AppErrorState } from "@/components/app-error-state";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global app error", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <AppErrorState
          title="Willing Ways AI needs a quick refresh"
          message="The page ran into an unexpected problem. Retry now, or go back to the main AI call and continue there."
          onRetry={reset}
          primaryHref="/"
          primaryLabel="Open the AI call"
        />
      </body>
    </html>
  );
}
