import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHeader({ title, description, actions, breadcrumbs }: { title: string; description?: string; actions?: React.ReactNode; breadcrumbs?: Array<{ label: string; href?: string }> }) {
  return (
    <div className="mb-6">
      {breadcrumbs?.length ? (
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-xs text-slate-500">
          {breadcrumbs.map((b, i) => (
            <span key={b.label} className="flex items-center gap-1">
              {i > 0 ? <ChevronRight className="size-3" aria-hidden /> : null}
              {b.href ? <Link href={b.href} className="hover:text-brand-700 hover:underline">{b.label}</Link> : <span aria-current="page">{b.label}</span>}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-800">{title}</h1>
          {description ? <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
