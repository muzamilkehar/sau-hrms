import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { dateToKey, formatKeyDate, todayKey } from "@/lib/dates";
import { formatDateTime } from "@/lib/utils";
import { LEAVE_LABEL } from "@/modules/leave/rules";
import { listOwnLeave } from "@/modules/leave/service";
import { LeaveBadge } from "@/components/status-badges";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page-header";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { CancelForm } from "./cancel-form";
import { LeaveWorkspace } from "./leave-workspace";

export const metadata: Metadata = { title: "Leave" };

export default async function LeavePage() {
  const user = await requireRole("EMPLOYEE");
  const requests = await listOwnLeave(user);
  const calendar = requests.map((r) => ({ startKey: dateToKey(r.startDate), endKey: dateToKey(r.endDate), status: r.status }));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand-800">Leave</h1>
      <LeaveWorkspace key={requests.length} requests={calendar} today={todayKey()} />
      <Card>
        <CardHeader title="Leave history" description="All your requests, newest first." />
        {requests.length === 0 ? <EmptyState title="No leave requests yet" /> : (
          <TableWrap>
            <Table>
              <thead><tr><Th>Type</Th><Th>From</Th><Th>To</Th><Th>Days</Th><Th>Reason</Th><Th>Status</Th><Th>HR remarks</Th><Th><span className="sr-only">Actions</span></Th></tr></thead>
              <tbody>
                {requests.map((r) => (
                  <Tr key={r.id}>
                    <Td className="whitespace-nowrap">{LEAVE_LABEL[r.type]}</Td>
                    <Td className="whitespace-nowrap">{formatKeyDate(dateToKey(r.startDate))}</Td>
                    <Td className="whitespace-nowrap">{formatKeyDate(dateToKey(r.endDate))}</Td>
                    <Td>{r.days}</Td>
                    <Td className="max-w-xs text-slate-600">{r.reason}<p className="text-xs text-slate-400">Requested {formatDateTime(r.createdAt)}</p></Td>
                    <Td><LeaveBadge status={r.status} /></Td>
                    <Td className="max-w-xs text-slate-600">{r.remarks ?? "-"}</Td>
                    <Td>{r.status === "PENDING" ? <CancelForm id={r.id} /> : null}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
