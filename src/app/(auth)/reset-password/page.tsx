import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { ActionForm, Field } from "@/components/forms/action-form";
import { Input } from "@/components/ui/input";
import { resetPasswordAction } from "../actions";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  if (!token || error) {
    return (
      <div className="space-y-4">
        <Alert tone="danger" title="This reset link is invalid or has expired">Request a new link and try again.</Alert>
        <Link href="/forgot-password" className="block text-center text-sm font-medium text-brand-700 hover:underline">Request a new link</Link>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-brand-800">Choose a new password</h2>
        <p className="mt-1 text-sm text-slate-500">Use at least 12 characters with a mix of letters, numbers and symbols.</p>
      </div>
      <ActionForm action={resetPasswordAction} submitLabel="Change password" pendingLabel="Saving...">
        <input type="hidden" name="token" value={token} />
        <Field name="newPassword" label="New password" required><Input type="password" autoComplete="new-password" className="h-11" /></Field>
        <Field name="confirm" label="Confirm new password" required><Input type="password" autoComplete="new-password" className="h-11" /></Field>
      </ActionForm>
      <Link href="/login" className="block text-center text-sm font-medium text-brand-700 hover:underline">Back to sign in</Link>
    </div>
  );
}
