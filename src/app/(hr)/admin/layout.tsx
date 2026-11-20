import { createElement } from "react";
import { CalendarCheck, Clock, LayoutDashboard, Users, Wallet } from "lucide-react";
import { requireRole } from "@/lib/session";
import { Shell, type ShellNavItem } from "@/components/layout/shell";

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("HR_ADMIN");
  const icon = (c: typeof Users) => createElement(c, { "aria-hidden": true });
  const items: ShellNavItem[] = [
    { label: "Dashboard", href: "/admin", icon: icon(LayoutDashboard), exact: true },
    { label: "Employee Directory", href: "/admin/employees", icon: icon(Users) },
    { label: "Attendance Records", href: "/admin/attendance", icon: icon(Clock) },
    { label: "Leave Approvals", href: "/admin/leave", icon: icon(CalendarCheck) },
    { label: "Payroll", href: "/admin/payroll", icon: icon(Wallet) },
  ];
  return <Shell items={items} portal="HR / Admin Console" user={{ email: user.email, code: user.employeeCode, roleLabel: "HR/Admin" }}>{children}</Shell>;
}
