import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-muted/20", className)} />;
}

export function EmptyState({ title, description, action }: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}

export function ErrorState({ title = "Something went wrong", description, onRetry }: {
  title?: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <section role="alert" className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="size-7" aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-2xl font-bold">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
      {onRetry ? <Button className="mt-6" onClick={onRetry}>Try again</Button> : null}
    </section>
  );
}
