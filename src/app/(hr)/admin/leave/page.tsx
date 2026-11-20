import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { dateToKey, formatKeyDate } from "@/lib/dates";
import { formatDateTime } from "@/lib/utils";
import { first, parsePage } from "@/lib/pagination";
import { LEAVE_LABEL } from "@/modules/leave/rules";
import { listAllLeave, type LeaveListQuery } from "@/modules/leave/service";
import { LeaveBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { DecisionForm } from "./decision-form";

export const metadata: Metadata = { title: "Leave Approvals" };
const OPTIONS: Array<[LeaveListQuery["status"], string]> = [["PENDING", "Pending"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"], ["ALL", "All"]];

export default async function LeaveApprovalsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole("HR_ADMIN");
  const sp = await searchParams;
  const raw = first(sp.status);
  const status = (OPTIONS.map((o) => o[0]) as string[]).includes(raw ?? "") ? (raw as LeaveListQuery["status"]) : "PENDING";
  const paging = parsePage(sp, 20);
  const { rows, total } = await listAllLeave(user, { status, skip: paging.skip, take: paging.take });
  return (
    <div>
      <PageHeader title="Leave Approvals" description="Approve or reject leave requests. Remarks are optional and are sent to the employee." />
      <Card>
        <form method="get" className="flex flex-wrap items-end gap-2 border-b border-slate-100 p-4">
          <div><label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-600">Show</label>
            <Select id="status" name="status" defaultValue={status} className="w-44">{OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div>
          <Button type="submit" variant="secondary">Apply</Button>
        </form>
        {rows.length === 0 ? <EmptyState title="No leave requests" description="Nothing matches this filter." /> : (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => (
              <li key={r.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_340px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{r.employee.firstName} {r.employee.lastName}</p>
                    <span className="text-xs text-slate-500">{r.employee.employeeCode} &middot; {r.employee.department}</span>
                    <LeaveBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{LEAVE_LABEL[r.type]}: {formatKeyDate(dateToKey(r.startDate))} to {formatKeyDate(dateToKey(r.endDate))} <span className="text-slate-500">({r.days} working day{r.days === 1 ? "" : "s"})</span></p>
                  <p className="mt-1 text-sm text-slate-600">Reason: {r.reason}</p>
                  <p className="mt-1 text-xs text-slate-400">Requested {formatDateTime(r.createdAt)}{r.decidedAt ? ` \u00b7 decided ${formatDateTime(r.decidedAt)}` : ""}</p>
                  {r.remarks ? <p className="mt-1 text-xs text-slate-600">HR remarks: {r.remarks}</p> : null}
                </div>
                {r.status === "PENDING" ? <DecisionForm id={r.id} /> : null}
              </li>
            ))}
          </ul>
        )}
        <Pagination basePath="/admin/leave" params={{ status }} page={paging.page} pageSize={paging.pageSize} total={total} />
      </Card>
    </div>
  );
}
