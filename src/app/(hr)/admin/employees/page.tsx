import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { first, parsePage } from "@/lib/pagination";
import { formatKeyDate, dateToKey } from "@/lib/dates";
import { titleCase } from "@/lib/utils";
import { listEmployees } from "@/modules/employees/service";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";

export const metadata: Metadata = { title: "Employee Directory" };

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole("HR_ADMIN");
  const sp = await searchParams;
  const q = first(sp.q)?.trim().slice(0, 100) || undefined;
  const paging = parsePage(sp, 25);
  const { rows, total } = await listEmployees(user, { q, skip: paging.skip, take: paging.take });
  return (
    <div>
      <PageHeader title="Employee Directory" description="Everyone in the system." actions={<ButtonLink href="/admin/employees/new">Add employee</ButtonLink>} />
      <Card>
        <form method="get" className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
          <Input name="q" defaultValue={q} placeholder="Search by email or employee ID..." aria-label="Search employees" className="max-w-md" />
          <Button type="submit" variant="secondary">Search</Button>
          {q ? <Link href="/admin/employees" className="inline-flex h-9 items-center px-3 text-sm text-slate-600 hover:underline">Clear</Link> : null}
        </form>
        {rows.length === 0 ? <EmptyState title="No employees found" description={q ? "Try a different email or employee ID." : undefined} /> : (
          <TableWrap>
            <Table>
              <thead><tr><Th>Employee</Th><Th>Department</Th><Th>Designation</Th><Th>Joined</Th><Th>Type</Th><Th>Status</Th></tr></thead>
              <tbody>
                {rows.map((e) => (
                  <Tr key={e.id}>
                    <Td>
                      <Link href={`/admin/employees/${e.id}`} className="font-medium text-brand-700 hover:underline">{e.firstName} {e.lastName}</Link>
                      <p className="text-xs text-slate-500">{e.employeeCode} &middot; {e.user.email}</p>
                    </Td>
                    <Td>{e.department}</Td>
                    <Td>{e.designation}{e.user.role === "HR_ADMIN" ? <> <Badge tone="gold">HR/Admin</Badge></> : null}</Td>
                    <Td className="whitespace-nowrap">{formatKeyDate(dateToKey(e.joiningDate))}</Td>
                    <Td>{titleCase(e.employmentType)}</Td>
                    <Td>{e.user.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
        <Pagination basePath="/admin/employees" params={{ q }} page={paging.page} pageSize={paging.pageSize} total={total} />
      </Card>
    </div>
  );
}
