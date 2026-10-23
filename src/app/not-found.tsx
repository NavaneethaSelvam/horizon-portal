
import Link from "next/link";
import { Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary">
          <SearchX className="size-8" aria-hidden="true" />
        </div>

        <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-primary">
          Error 404
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Page not found
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
          It may have moved or the address may be incorrect.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Home className="size-4" aria-hidden="true" />
          Back to Home
        </Link>
      </section>
    </main>
  );
}
