import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { formatDayLabel, isWeekend, todayKey } from "@/lib/dates";
import { formatHours, formatTime } from "@/lib/format";
import { listOwnAttendance, getTodayRecord } from "@/modules/attendance/service";
import { AttendanceBadge } from "@/components/status-badges";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page-header";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { ClockPanel } from "./clock-panel";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const user = await requireRole("EMPLOYEE");
  const now = new Date();
  const today = todayKey(now);
  const [rec, history] = await Promise.all([getTodayRecord(user, now), listOwnAttendance(user, 30, now)]);
  const weekend = isWeekend(today);
  const todayRow = history.find((r) => r.key === today);
  const status = rec ? (rec.checkOut ? rec.status : "PRESENT") : todayRow?.status ?? "NOT_YET";
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand-800">My attendance</h1>
      <ClockPanel
        label={formatDayLabel(today)}
        checkIn={formatTime(rec?.checkIn)} checkOut={formatTime(rec?.checkOut)}
        status={weekend && !rec ? "NOT_YET" : status}
        canIn={!rec && !weekend && status !== "LEAVE"} canOut={!!rec && !rec.checkOut}
        note={weekend && !rec ? "Today is a weekly off." : status === "LEAVE" && !rec ? "You are on approved leave today." : "A day with at least 6 hours between check-in and check-out counts as present; less is a half-day."}
      />
      <Card>
        {history.length === 0 ? <EmptyState title="No attendance yet" /> : (
          <TableWrap>
            <Table>
              <thead><tr><Th>Date</Th><Th>Check in</Th><Th>Check out</Th><Th>Hours</Th><Th>Status</Th></tr></thead>
              <tbody>
                {history.map((r) => (
                  <Tr key={r.key}><Td className="whitespace-nowrap">{formatDayLabel(r.key)}</Td><Td>{formatTime(r.checkIn)}</Td><Td>{formatTime(r.checkOut)}</Td><Td>{formatHours(r.hours)}</Td><Td><AttendanceBadge status={r.status} /></Td></Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>
      <p className="text-xs text-slate-500">Showing the last 30 days. Weekly off days are not listed.</p>
    </div>
  );
}
