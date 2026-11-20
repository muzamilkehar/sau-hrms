import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { formatPKR } from "@/lib/format";
import { getOwnSalary } from "@/modules/payroll/service";
import { grossPay, netPay } from "@/modules/payroll/rules";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Salary" };

export default async function SalaryPage() {
  const user = await requireRole("EMPLOYEE");
  const s = await getOwnSalary(user);
  const lines: Array<[string, string, string?]> = [
    ["Basic", formatPKR(s.basic)],
    ["HRA (house rent allowance)", formatPKR(s.hra)],
    ["Allowances", formatPKR(s.allowances)],
    ["Gross pay", formatPKR(grossPay(s)), "font-semibold"],
    ["Deductions", s.deductions ? `- ${formatPKR(s.deductions)}` : formatPKR(0), "text-red-700"],
  ];
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-brand-800">Salary</h1>
      <Card>
        <CardHeader title="Monthly salary breakdown" description="Only you and HR can see this. Contact HR if something looks wrong." />
        <CardBody>
          <dl className="divide-y divide-slate-100">
            {lines.map(([k, v, cls]) => <div key={k} className="flex items-center justify-between py-3 text-sm"><dt className="text-slate-600">{k}</dt><dd className={cls ?? "text-slate-900"}>{v}</dd></div>)}
          </dl>
          <div className="mt-2 flex items-center justify-between rounded-md bg-emerald-50 px-4 py-3"><span className="text-sm font-semibold text-emerald-900">Net monthly pay</span><span className="text-lg font-bold text-emerald-700">{formatPKR(netPay(s))}</span></div>
        </CardBody>
      </Card>
    </div>
  );
}
