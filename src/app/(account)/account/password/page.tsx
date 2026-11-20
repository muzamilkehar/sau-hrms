import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireUser, homeFor } from "@/lib/session";
import { ActionForm, Field } from "@/components/forms/action-form";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { changePasswordAction } from "./actions";

export const metadata: Metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPasswordChange: true });
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <Image src="/logo.png" alt="" width={44} height={44} className="size-11 rounded-full bg-white p-0.5 shadow-sm ring-1 ring-slate-200" />
          <div><p className="font-bold text-brand-800">SAU HR Portal</p><p className="text-xs text-slate-500">{user.email}</p></div>
        </div>
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold text-brand-800">Change password</h1>
              <p className="mt-1 text-sm text-slate-500">Use at least 12 characters, mixing letters, numbers and symbols.</p>
            </div>
            {user.mustChangePassword ? <Alert tone="warning" title="Choose a new password to continue">You signed in with a temporary password.</Alert> : null}
            <ActionForm action={changePasswordAction} submitLabel="Change password" pendingLabel="Saving...">
              <Field name="currentPassword" label="Current password" required><Input type="password" autoComplete="current-password" /></Field>
              <Field name="newPassword" label="New password" required><Input type="password" autoComplete="new-password" /></Field>
              <Field name="confirm" label="Confirm new password" required><Input type="password" autoComplete="new-password" /></Field>
            </ActionForm>
            {!user.mustChangePassword ? <Link href={homeFor(user.role)} className="block text-center text-sm font-medium text-brand-700 hover:underline">Back to my portal</Link> : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
