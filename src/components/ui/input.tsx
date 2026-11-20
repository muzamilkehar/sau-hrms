import * as React from "react";
import { cn } from "@/lib/utils";

const base = "w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 disabled:bg-slate-100 aria-[invalid=true]:border-red-500";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, "h-9", className)} {...props} />;
}
export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(base, "h-9 pr-8", className)} {...props}>{children}</select>;
}
export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "min-h-20 py-2", className)} {...props} />;
}
export function Checkbox({ className, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  return <input type="checkbox" className={cn("size-4 rounded border-slate-300 accent-brand-700", className)} {...props} />;
}
