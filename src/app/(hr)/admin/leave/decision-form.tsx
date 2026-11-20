"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decideLeaveAction } from "./actions";

type Result = import("@/lib/action").FormState;

function Buttons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex gap-2">
      <Button type="submit" name="decision" value="APPROVED" size="sm" disabled={pending}>Approve</Button>
      <Button type="submit" name="decision" value="REJECTED" size="sm" variant="dangerOutline" disabled={pending}>Reject</Button>
    </div>
  );
}

export function DecisionForm({ id }: { id: string }) {
  const [state, action] = useActionState<Result, FormData>(decideLeaveAction, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <Input name="remarks" placeholder="Remarks (optional)" maxLength={300} aria-label="Remarks (optional)" />
      <Buttons />
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
    </form>
  );
}
