import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { first, parsePage } from "@/lib/pagination";
import { listPayroll } from "@/modules/payroll/service";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableWrap, Th } from "@/components/ui/table";
import { PayrollRow } from "./payroll-row";

export const metadata: Metadata = { title: "Payroll" };
const ZERO = { basic: 0, hra: 0, allowances: 0, deductions: 0 };

export default async function PayrollPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole("HR_ADMIN");
  const sp = await searchParams;
  const q = first(sp.q)?.trim().slice(0, 100) || undefined;
  const paging = parsePage(sp, 25);
  const { rows, total } = await listPayroll(user, { q, skip: paging.skip, take: paging.take });
  return (
    <div>
      <PageHeader title="Payroll" description="Monthly salary structure per employee. Net = basic + HRA + allowances - deductions. Every change is recorded in the activity log." />
      <Card>
        <form method="get" className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
          <Input name="q" defaultValue={q} placeholder="Search by email or employee ID..." aria-label="Search payroll" className="max-w-md" />
          <Button type="submit" variant="secondary">Search</Button>
          {q ? <Link href="/admin/payroll" className="inline-flex h-9 items-center px-3 text-sm text-slate-600 hover:underline">Clear</Link> : null}
        </form>
        {rows.length === 0 ? <EmptyState title="No employees found" /> : (
          <TableWrap>
            <Table>
              <thead><tr><Th>Employee</Th><Th>Basic</Th><Th>HRA</Th><Th>Allowances</Th><Th>Deductions</Th><Th>Net</Th><Th><span className="sr-only">Edit</span></Th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <PayrollRow key={`${r.id}-${r.salary?.updatedAt.getTime() ?? 0}`} id={r.id} name={`${r.firstName} ${r.lastName}`} code={r.employeeCode} email={r.user.email}
                    salary={r.salary ? { basic: r.salary.basic, hra: r.salary.hra, allowances: r.salary.allowances, deductions: r.salary.deductions } : ZERO} />
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
        <Pagination basePath="/admin/payroll" params={{ q }} page={paging.page} pageSize={paging.pageSize} total={total} />
      </Card>
    </div>
  );
}
