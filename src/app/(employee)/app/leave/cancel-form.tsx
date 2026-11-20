"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { cancelLeaveAction } from "./actions";

export function CancelForm({ id }: { id: string }) {
  const [state, action] = useActionState<import("@/lib/action").FormState, FormData>(cancelLeaveAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="outline" onClick={(e) => { if (!window.confirm("Cancel this request?")) e.preventDefault(); }}>Cancel</Button>
      {state && !state.ok ? <p className="mt-1 text-xs text-red-700">{state.error}</p> : null}
    </form>
  );
}
