"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Td, Tr } from "@/components/ui/table";
import { formatPKR } from "@/lib/format";
import { netPay } from "@/modules/payroll/rules";
import { updateSalaryAction } from "./actions";

type Result = import("@/lib/action").FormState;
interface Props { id: string; name: string; code: string; email: string; salary: { basic: number; hra: number; allowances: number; deductions: number } }

function Save() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>;
}

function Num({ name, label, value, error }: { name: string; label: string; value: number; error?: string[] }) {
  return (
    <div>
      <label htmlFor={`${name}`} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <Input id={name} name={name} type="number" min={0} step={1} inputMode="numeric" defaultValue={value} aria-invalid={error ? true : undefined} />
      {error ? <p className="mt-1 text-xs font-medium text-red-700">{error.join(" ")}</p> : null}
    </div>
  );
}

export function PayrollRow({ id, name, code, email, salary }: Props) {
  const [open, setOpen] = React.useState(false);
  const [state, action] = useActionState<Result, FormData>(updateSalaryAction, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return (
    <>
      <Tr>
        <Td><p className="font-medium text-slate-900">{name}</p><p className="text-xs text-slate-500">{code} &middot; {email}</p></Td>
        <Td className="whitespace-nowrap">{formatPKR(salary.basic)}</Td>
        <Td className="whitespace-nowrap">{formatPKR(salary.hra)}</Td>
        <Td className="whitespace-nowrap">{formatPKR(salary.allowances)}</Td>
        <Td className="whitespace-nowrap font-medium text-red-700">{salary.deductions ? `- ${formatPKR(salary.deductions)}` : formatPKR(0)}</Td>
        <Td className="whitespace-nowrap font-semibold text-emerald-700">{formatPKR(netPay(salary))}</Td>
        <Td><button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="text-sm font-medium text-brand-700 hover:underline">{open ? "Close" : "Edit"}</button></Td>
      </Tr>
      {open ? (
        <tr className="bg-brand-50/40">
          <td colSpan={7} className="px-4 py-4">
            <form action={action} className="space-y-3">
              <input type="hidden" name="employeeId" value={id} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Num name="basic" label="Basic" value={salary.basic} error={errors.basic} />
                <Num name="hra" label="HRA" value={salary.hra} error={errors.hra} />
                <Num name="allowances" label="Allowances" value={salary.allowances} error={errors.allowances} />
                <Num name="deductions" label="Deductions" value={salary.deductions} error={errors.deductions} />
              </div>
              <div className="flex flex-wrap items-center gap-3"><Save />{state?.ok ? <span className="text-sm font-medium text-emerald-700">{state.message}</span> : null}</div>
              {state && !state.ok && !Object.keys(errors).length ? <Alert tone="danger">{state.error}</Alert> : null}
            </form>
          </td>
        </tr>
      ) : null}
    </>
  );
}
