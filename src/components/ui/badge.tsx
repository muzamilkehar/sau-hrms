import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      neutral: "bg-slate-100 text-slate-700",
      brand: "bg-brand-50 text-brand-700",
      success: "bg-emerald-50 text-emerald-700",
      warning: "bg-amber-50 text-amber-800",
      danger: "bg-red-50 text-red-700",
      info: "bg-blue-50 text-blue-700",
      gold: "bg-gold-100 text-gold-700",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ tone, className, children }: VariantProps<typeof badge> & { className?: string; children: React.ReactNode }) {
  return <span className={cn(badge({ tone }), className)}>{children}</span>;
}
