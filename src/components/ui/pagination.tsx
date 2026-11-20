import Link from "next/link";
import { pageCount } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export function Pagination({ basePath, params, page, pageSize, total }: { basePath: string; params: Record<string, string | undefined>; page: number; pageSize: number; total: number }) {
  const pages = pageCount(total, pageSize);
  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, page: String(p), pageSize: String(pageSize) })) if (v) qs.set(k, v);
    return `${basePath}?${qs.toString()}`;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const link = "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
      <span>Showing {from}-{to} of {total}</span>
      <div className="flex items-center gap-2">
        {page > 1 ? <Link className={link} href={href(page - 1)}>Previous</Link> : <span className={cn(link, "pointer-events-none opacity-50")}>Previous</span>}
        <span className="px-1">Page {page} of {pages}</span>
        {page < pages ? <Link className={link} href={href(page + 1)}>Next</Link> : <span className={cn(link, "pointer-events-none opacity-50")}>Next</span>}
      </div>
    </div>
  );
}
