import Link from "next/link";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-60 cursor-pointer whitespace-nowrap",
  {
    variants: {
      variant: {
        primary: "bg-brand-700 text-white hover:bg-brand-800",
        secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100",
        outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        ghost: "text-slate-600 hover:bg-slate-100",
        danger: "bg-red-700 text-white hover:bg-red-800",
        dangerOutline: "border border-red-300 bg-white text-red-700 hover:bg-red-50",
      },
      size: { sm: "h-8 px-3", md: "h-9 px-4", lg: "h-10 px-5" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function ButtonLink({ className, variant, size, href, ...props }: { href: string; className?: string; children: React.ReactNode } & VariantProps<typeof buttonVariants>) {
  return <Link href={href} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
