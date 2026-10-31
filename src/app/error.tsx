
"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/states";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Horizon Portal error:", error);
  }, [error]);

  return <main className="flex min-h-[70vh] items-center justify-center p-6"><ErrorState description="We couldn't load this page. Please try again. If the problem continues, contact your portal administrator." onRetry={reset} /></main>;
}
