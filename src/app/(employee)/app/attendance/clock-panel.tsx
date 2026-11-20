"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { AttendanceBadge } from "@/components/status-badges";
import { clockAction } from "./actions";

type Result = import("@/lib/action").FormState;

function Buttons({ canIn, canOut }: { canIn: boolean; canOut: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex gap-3">
      <Button type="submit" name="op" value="in" size="lg" disabled={pending || !canIn} className="bg-emerald-600 hover:bg-emerald-700">Check in</Button>
      <Button type="submit" name="op" value="out" size="lg" disabled={pending || !canOut} variant="danger">Check out</Button>
    </div>
  );
}

export function ClockPanel({ label, checkIn, checkOut, status, canIn, canOut, note }: { label: string; checkIn: string; checkOut: string; status: "PRESENT" | "HALF_DAY" | "ABSENT" | "LEAVE" | "NOT_YET"; canIn: boolean; canOut: boolean; note?: string }) {
  const [state, action] = useActionState<Result, FormData>(clockAction, null);
  return (
    <div className="space-y-4">
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Today</h2>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-sm text-slate-600">Checked in {checkIn} &middot; Checked out {checkOut}</p>
            {note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}
          </div>
          <form action={action} className="flex flex-wrap items-center gap-4">
            <AttendanceBadge status={status} />
            <Buttons canIn={canIn} canOut={canOut} />
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
