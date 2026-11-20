import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Clock, User, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page-header";
import { markAllReadAction } from "./actions";

export const metadata: Metadata = { title: "Dashboard" };

const CARDS = [
  { href: "/app/profile", title: "My Profile", text: "View and update your personal details", icon: User },
  { href: "/app/attendance", title: "Attendance", text: "Check in, check out and view your history", icon: Clock },
  { href: "/app/leave", title: "Leave Requests", text: "Apply for leave and track approvals", icon: CalendarDays },
  { href: "/app/salary", title: "Salary", text: "View your salary breakdown", icon: Wallet },
];

export default async function EmployeeDashboard() {
  const user = await requireRole("EMPLOYEE");
  const notes = await prisma.notification.findMany({ where: { userId: user.userId }, orderBy: { createdAt: "desc" }, take: 10 });
  const unread = notes.some((n) => !n.readAt);
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-brand-800">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Signed in as {user.email} ({user.employeeCode})</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map(({ href, title, text, icon: Icon }) => (
          <Link key={href} href={href} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-xs transition hover:border-brand-300 hover:shadow-md">
            <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700 group-hover:bg-brand-100"><Icon className="size-5" aria-hidden /></span>
            <p className="mt-4 text-base font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{text}</p>
          </Link>
        ))}
      </div>
      <Card className="mt-6">
        <CardHeader title="Recent activity" action={unread ? <form action={markAllReadAction}><Button type="submit" size="sm" variant="outline">Mark all as read</Button></form> : undefined} />
        {notes.length === 0 ? <EmptyState title="No activity yet" description="Decisions on your leave requests will appear here." /> : (
          <ul className="divide-y divide-slate-100">
            {notes.map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-sm text-slate-800">{n.message}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(n.createdAt)}</p>
                </div>
                {!n.readAt ? <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand-600" aria-label="Unread" /> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
