import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { addDays, diffDays, formatDayLabel, isDateKey, todayKey } from "@/lib/dates";
import { formatHours, formatTime } from "@/lib/format";
import { first, parsePage } from "@/lib/pagination";
import { STATUS_FILTERS, type StatusFilter } from "@/modules/attendance/rules";
import { listAllAttendance } from "@/modules/attendance/service";
import { AttendanceBadge } from "@/components/status-badges";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";

export const metadata: Metadata = { title: "Attendance Records" };
const LABEL: Record<StatusFilter, string> = { ALL: "All", PRESENT: "Present", ABSENT: "Absent", HALF_DAY: "Half-Day", LEAVE: "Leave" };
const MAX_RANGE_DAYS = 62;

export default async function AttendancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole("HR_ADMIN");
  const sp = await searchParams;
  const today = todayKey();
  let from = isDateKey(first(sp.from)) ? first(sp.from)! : addDays(today, -6);
  let to = isDateKey(first(sp.to)) ? first(sp.to)! : today;
  const notices: string[] = [];
  if (to < from) { [from, to] = [to, from]; }
  if (diffDays(from, to) + 1 > MAX_RANGE_DAYS) { from = addDays(to, -(MAX_RANGE_DAYS - 1)); notices.push(`The range is limited to ${MAX_RANGE_DAYS} days, so it was shortened.`); }
  const rawStatus = first(sp.status);
  const status = (STATUS_FILTERS as readonly string[]).includes(rawStatus ?? "") ? (rawStatus as StatusFilter) : "ALL";
  const q = first(sp.q)?.trim().slice(0, 100) || undefined;
  const paging = parsePage(sp, 25);
  const { rows, total } = await listAllAttendance(user, { from, to, status, q, skip: paging.skip, take: paging.take });
  return (
    <div>
      <PageHeader title="Attendance Records" description="Attendance of all employees. Weekends are not counted." />
      <Card>
        <form method="get" className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div><label htmlFor="from" className="mb-1 block text-xs font-medium text-slate-600">From</label><Input id="from" type="date" name="from" defaultValue={from} max={today} /></div>
          <div><label htmlFor="to" className="mb-1 block text-xs font-medium text-slate-600">To</label><Input id="to" type="date" name="to" defaultValue={to} max={today} /></div>
          <div><label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-600">Status</label>
            <Select id="status" name="status" defaultValue={status}>{STATUS_FILTERS.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}</Select></div>
          <div className="lg:col-span-2"><label htmlFor="q" className="mb-1 block text-xs font-medium text-slate-600">Employee</label><Input id="q" name="q" defaultValue={q} placeholder="Name, email or employee ID" /></div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-5"><Button type="submit" variant="secondary">Apply filters</Button><Link href="/admin/attendance" className="inline-flex h-9 items-center px-3 text-sm text-slate-600 hover:underline">Reset</Link></div>
        </form>
        {notices.map((n) => <div key={n} className="p-4 pb-0"><Alert tone="info">{n}</Alert></div>)}
        {rows.length === 0 ? <EmptyState title="No records match" description="Try a wider date range or a different status." /> : (
          <TableWrap>
            <Table>
              <thead><tr><Th>Employee</Th><Th>Date</Th><Th>Check in</Th><Th>Check out</Th><Th>Hours</Th><Th>Status</Th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <Tr key={`${r.employeeId}-${r.key}`}>
                    <Td><p className="font-medium text-slate-900">{r.employee.firstName} {r.employee.lastName}</p><p className="text-xs text-slate-500">{r.employee.employeeCode}</p></Td>
                    <Td className="whitespace-nowrap">{formatDayLabel(r.key)}</Td>
                    <Td>{formatTime(r.checkIn)}</Td>
                    <Td>{formatTime(r.checkOut)}</Td>
                    <Td>{formatHours(r.hours)}</Td>
                    <Td><AttendanceBadge status={r.status} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
        <Pagination basePath="/admin/attendance" params={{ from, to, status, q }} page={paging.page} pageSize={paging.pageSize} total={total} />
      </Card>
    </div>
  );
}
