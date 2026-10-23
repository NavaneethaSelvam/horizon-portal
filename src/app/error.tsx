
"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

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

  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <section
        role="alert"
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 text-center shadow-sm"
      >
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary">
          <AlertTriangle className="size-8" aria-hidden="true" />
        </div>

        <h1 className="mt-6 text-2xl font-bold">
          Something went wrong
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted">
          We couldn&apos;t load this page. Please try again.
          If the problem continues, contact your portal administrator.
        </p>

        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </button>
      </section>
    </main>
  );
}
