"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ShellNavItem { label: string; href: string; icon: React.ReactNode; exact?: boolean }

function Brand({ portal }: { portal: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
      <Image src="/logo.png" alt="" width={40} height={40} priority className="size-10 rounded-full bg-white p-0.5 shadow-sm" />
      <div className="leading-tight">
        <p className="text-base font-bold text-white">SAU HR</p>
        <p className="text-xs text-brand-200/80">{portal}</p>
      </div>
    </div>
  );
}

function NavList({ items, onNavigate }: { items: ShellNavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-1">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                className={cn("flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-white/15 text-white" : "text-brand-100/90 hover:bg-white/10 hover:text-white")}>
                <span className="[&>svg]:size-[18px]">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Shell({ items, portal, user, children }: { items: ShellNavItem[]; portal: string; user: { email: string; code: string | null; roleLabel: string }; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  async function signOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }
  const signOutButton = (
    <div className="border-t border-white/10 p-4">
      <button type="button" onClick={signOut} className="w-full rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20">Sign out</button>
    </div>
  );
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-brand-700 lg:flex">
        <Brand portal={portal} />
        <NavList items={items} />
        {signOutButton}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-brand-700">
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded p-1 text-white hover:bg-white/10"><X className="size-5" /></button>
            <Brand portal={portal} />
            <NavList items={items} onNavigate={() => setOpen(false)} />
            {signOutButton}
          </aside>
        </div>
      ) : null}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="rounded p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu className="size-5" /></button>
            <p className="text-sm font-semibold text-slate-800">{portal}</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="hidden truncate sm:block">{user.email}{user.code ? ` \u00b7 ${user.code}` : ""}</span>
            <Badge tone="brand">{user.roleLabel}</Badge>
            <Link href="/account/password" className="text-xs font-medium text-brand-700 hover:underline">Change password</Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
