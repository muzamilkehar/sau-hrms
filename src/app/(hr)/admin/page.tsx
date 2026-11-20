import type { Metadata } from "next";
import { CalendarClock, UserCheck, Users } from "lucide-react";
import { requireRole } from "@/lib/session";
import { formatDateTime, greeting } from "@/lib/utils";
import { hrDashboard } from "@/modules/dashboard";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page-header";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard" };

function Stat({ label, value, caption, icon, className, href }: { label: string; value: number; caption: string; icon: React.ReactNode; className: string; href: string }) {
  return (
    <Link href={href} className={`block rounded-lg p-5 text-white shadow-xs transition hover:shadow-md ${className}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-md bg-white/20">{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-white/80">{caption}</p>
    </Link>
  );
}

export default async function AdminDashboard() {
  const user = await requireRole("HR_ADMIN");
  const { employees, presentToday, pendingLeaves, activity } = await hrDashboard(user);
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-brand-800">{greeting()}, {user.name}</h1>
        <p className="mt-1 text-sm text-slate-500">{pendingLeaves > 0 ? `${pendingLeaves} leave request${pendingLeaves === 1 ? " is" : "s are"} waiting for your decision.` : "No leave requests are waiting."}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat href="/admin/employees" label="Employees" value={employees} caption="active in the system" icon={<Users className="size-5" />} className="bg-gradient-to-br from-brand-700 to-brand-600" />
        <Stat href="/admin/attendance" label="Present today" value={presentToday} caption={`of ${employees} employees`} icon={<UserCheck className="size-5" />} className="bg-gradient-to-br from-teal-brand to-emerald-600" />
        <Stat href="/admin/leave?status=PENDING" label="Pending leave requests" value={pendingLeaves} caption="waiting for approval" icon={<CalendarClock className="size-5" />} className="bg-gradient-to-br from-gold-500 to-amber-600" />
      </div>
      <Card className="mt-6">
        <CardHeader title="Recent activities" description="The latest events across the system." />
        {activity.length === 0 ? <EmptyState title="No activity yet" /> : (
          <ul className="divide-y divide-slate-100">
            {activity.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-4 px-5 py-3">
                <p className="text-sm text-slate-800">{a.message}</p>
                <p className="shrink-0 text-xs text-slate-400">{formatDateTime(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
