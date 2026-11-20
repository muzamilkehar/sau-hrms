"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildCalendarMarks, monthGrid, type CalendarRequest } from "@/lib/calendar";
import { countWorkingDays, isWeekend, type DateKey } from "@/lib/dates";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { applyLeaveAction } from "./actions";

type Result = import("@/lib/action").FormState;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TONE = { APPROVED: "bg-emerald-500 text-white", PENDING: "bg-amber-300 text-amber-950", REJECTED: "bg-red-500 text-white" } as const;

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Submitting..." : "Submit request"}</Button>;
}

export function LeaveWorkspace({ requests, today }: { requests: CalendarRequest[]; today: DateKey }) {
  const [year, setYear] = React.useState(Number(today.slice(0, 4)));
  const [month, setMonth] = React.useState(Number(today.slice(5, 7)));
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [state, action] = useActionState<Result, FormData>(applyLeaveAction, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  const marks = React.useMemo(() => buildCalendarMarks(requests, year, month), [requests, year, month]);
  const grid = React.useMemo(() => monthGrid(year, month), [year, month]);
  const lo = start && end ? (start <= end ? start : end) : start;
  const hi = start && end ? (start <= end ? end : start) : start;
  const workingDays = start && end && lo <= hi ? countWorkingDays(lo, hi) : 0;

  function shift(delta: number) {
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth() + 1);
  }
  function pick(key: DateKey) {
    if (!start || (start && end)) { setStart(key); setEnd(""); return; }
    if (key < start) { setEnd(start); setStart(key); } else setEnd(key);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Apply for leave" description="Pick the dates on the calendar or type them." />
        <CardBody>
          <form action={action} className="space-y-4">
            {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
            {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}
            <div>
              <label htmlFor="type" className="mb-1 block text-sm font-medium text-slate-700">Leave type</label>
              <Select id="type" name="type" defaultValue="PAID"><option value="PAID">Paid</option><option value="UNPAID">Unpaid</option><option value="SICK">Sick</option></Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="startDate" className="mb-1 block text-sm font-medium text-slate-700">From</label>
                <Input id="startDate" name="startDate" type="date" value={start} onChange={(e) => { setStart(e.target.value); if (e.target.value) { setYear(Number(e.target.value.slice(0, 4))); setMonth(Number(e.target.value.slice(5, 7))); } }} aria-invalid={errors.startDate ? true : undefined} required />
                {errors.startDate ? <p className="mt-1 text-xs font-medium text-red-700">{errors.startDate.join(" ")}</p> : null}
              </div>
              <div>
                <label htmlFor="endDate" className="mb-1 block text-sm font-medium text-slate-700">To</label>
                <Input id="endDate" name="endDate" type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} aria-invalid={errors.endDate ? true : undefined} required />
                {errors.endDate ? <p className="mt-1 text-xs font-medium text-red-700">{errors.endDate.join(" ")}</p> : null}
              </div>
            </div>
            <p className="text-sm text-slate-500">{workingDays ? `${workingDays} working day${workingDays === 1 ? "" : "s"} (weekends are not counted).` : "Select the first and last day."}</p>
            <div>
              <label htmlFor="reason" className="mb-1 block text-sm font-medium text-slate-700">Reason</label>
              <Textarea id="reason" name="reason" maxLength={500} required aria-invalid={errors.reason ? true : undefined} />
              {errors.reason ? <p className="mt-1 text-xs font-medium text-red-700">{errors.reason.join(" ")}</p> : null}
            </div>
            <Submit />
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`${MONTHS[month - 1]} ${year}`} action={
          <div className="flex gap-1">
            <Button size="sm" variant="outline" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft className="size-4" /></Button>
            <Button size="sm" variant="outline" aria-label="Next month" onClick={() => shift(1)}><ChevronRight className="size-4" /></Button>
          </div>
        } />
        <CardBody>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">{WEEKDAYS.map((d) => <div key={d} className="py-1">{d}</div>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: grid.blanks }, (_, i) => <div key={`b${i}`} />)}
            {grid.days.map((key) => {
              const mark = marks.get(key);
              const inRange = lo && hi ? key >= lo && key <= hi : key === lo;
              return (
                <button key={key} type="button" onClick={() => pick(key)} aria-label={`${key}${mark ? `, ${mark.toLowerCase()}` : ""}${inRange ? ", selected" : ""}`} aria-pressed={inRange}
                  className={cn("flex aspect-square items-center justify-center rounded-md text-sm transition-colors", mark ? TONE[mark] : isWeekend(key) ? "bg-slate-50 text-slate-400" : "bg-white text-slate-800 hover:bg-slate-100", inRange && "ring-2 ring-brand-700 ring-offset-1", key === today && !mark && "border border-brand-400 font-semibold")}>
                  {Number(key.slice(8))}
                </button>
              );
            })}
          </div>
          <ul className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
            <li className="flex items-center gap-1.5"><span className="size-3 rounded bg-emerald-500" /> Approved</li>
            <li className="flex items-center gap-1.5"><span className="size-3 rounded bg-amber-300" /> Pending</li>
            <li className="flex items-center gap-1.5"><span className="size-3 rounded bg-red-500" /> Rejected</li>
            <li className="flex items-center gap-1.5"><span className="size-3 rounded ring-2 ring-brand-700" /> Selected</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
