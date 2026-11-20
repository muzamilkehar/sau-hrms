import { createElement } from "react";
import { CalendarDays, Clock, LayoutDashboard, User, Wallet } from "lucide-react";
import { requireRole } from "@/lib/session";
import { Shell, type ShellNavItem } from "@/components/layout/shell";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("EMPLOYEE");
  const icon = (c: typeof User) => createElement(c, { "aria-hidden": true });
  const items: ShellNavItem[] = [
    { label: "Dashboard", href: "/app", icon: icon(LayoutDashboard), exact: true },
    { label: "My Profile", href: "/app/profile", icon: icon(User) },
    { label: "Attendance", href: "/app/attendance", icon: icon(Clock) },
    { label: "Leave", href: "/app/leave", icon: icon(CalendarDays) },
    { label: "Salary", href: "/app/salary", icon: icon(Wallet) },
  ];
  return <Shell items={items} portal="Employee Portal" user={{ email: user.email, code: user.employeeCode, roleLabel: "Employee" }}>{children}</Shell>;
}
