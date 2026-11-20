"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy } from "lucide-react";
import type { ActionResult } from "@/lib/action";
import { Alert } from "@/components/ui/alert";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AnyResult = ActionResult<{ tempPassword?: string; href?: string; hrefLabel?: string } | undefined> | null;
type Action = (prev: AnyResult, formData: FormData) => Promise<AnyResult>;

const FieldErrors = React.createContext<Record<string, string[]>>({});

export function SubmitButton({ children, pendingLabel, variant, size, className }: { children: React.ReactNode; pendingLabel?: string } & Pick<ButtonProps, "variant" | "size" | "className">) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={pending} aria-busy={pending}>
      {pending ? (pendingLabel ?? "Working...") : children}
    </Button>
  );
}

/** Submit button that asks for confirmation first (deactivate, reset password, ...). */
export function ConfirmSubmit({ children, message, variant = "dangerOutline", size = "md", className }: { children: React.ReactNode; message: string } & Pick<ButtonProps, "variant" | "size" | "className">) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={pending} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {pending ? "Working..." : children}
    </Button>
  );
}

function TempPassword({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="mt-3 rounded-md border border-emerald-300 bg-white p-3">
      <p className="text-xs font-medium text-slate-600">Temporary password (shown once)</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="select-all rounded bg-slate-100 px-2 py-1 font-mono text-sm text-slate-900">{value}</code>
        <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-500">Give this to the user securely. They must choose a new password at first sign-in. It cannot be shown again.</p>
    </div>
  );
}

export function ActionForm({ action, children, submitLabel = "Save", pendingLabel, successMessage, className, footer, hideSubmit }: {
  action: Action; children: React.ReactNode; submitLabel?: string; pendingLabel?: string; successMessage?: string; className?: string; footer?: React.ReactNode; hideSubmit?: boolean;
}) {
  const [state, formAction] = useActionState<AnyResult, FormData>(action, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return (
    <FieldErrors.Provider value={errors}>
      <form action={formAction} className={cn("space-y-4", className)} noValidate>
        {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
        {state?.ok ? (
          <Alert tone="success" title={state.message ?? successMessage ?? "Saved."}>
            {state.data?.tempPassword ? <TempPassword value={state.data.tempPassword} /> : null}
            {state.data?.href ? <Link href={state.data.href} className="mt-2 inline-block font-medium underline">{state.data.hrefLabel ?? "Continue"}</Link> : null}
          </Alert>
        ) : null}
        {children}
        {hideSubmit ? null : (
          <div className="flex items-center gap-3 pt-1">
            <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
            {footer}
          </div>
        )}
      </form>
    </FieldErrors.Provider>
  );
}

export function Field({ name, label, hint, required, children }: { name: string; label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  const errors = React.useContext(FieldErrors)[name];
  const id = `f-${name}`;
  const describedBy = [errors ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  const child = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, { id, name, "aria-invalid": errors ? true : undefined, "aria-describedby": describedBy })
    : children;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}{required ? <span className="text-red-600"> *</span> : null}
      </label>
      {child}
      {hint ? <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      {errors ? <p id={`${id}-err`} className="mt-1 text-xs font-medium text-red-700">{errors.join(" ")}</p> : null}
    </div>
  );
}
