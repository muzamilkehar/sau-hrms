import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, Field } from "@/components/forms/action-form";
import { Input } from "@/components/ui/input";
import { requestPasswordResetAction } from "../actions";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-brand-800">Reset your password</h2>
        <p className="mt-1 text-sm text-slate-500">Enter your university email and we will send you a reset link.</p>
      </div>
      <ActionForm action={requestPasswordResetAction} submitLabel="Send reset link" pendingLabel="Sending...">
        <Field name="email" label="Email address" required>
          <Input type="email" autoComplete="username" placeholder="you@saus.edu.pk" className="h-11" />
        </Field>
      </ActionForm>
      <Link href="/login" className="block text-center text-sm font-medium text-brand-700 hover:underline">Back to sign in</Link>
    </div>
  );
}
