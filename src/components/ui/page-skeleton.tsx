export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-64 rounded bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 rounded-lg bg-slate-200" />
        <div className="h-28 rounded-lg bg-slate-200" />
        <div className="h-28 rounded-lg bg-slate-200" />
      </div>
      <div className="h-72 rounded-lg bg-slate-200" />
    </div>
  );
}