import { Skeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Loading page" className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <div role="status" className="sr-only">Loading page content…</div>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-9 w-72 max-w-full" />
      <Skeleton className="h-5 w-full max-w-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-36" />)}
      </div>
      <Skeleton className="h-72 w-full" />
    </main>
  );
}
