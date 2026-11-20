"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({ notice }: { notice?: string }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.signIn.email({ email: email.trim(), password });
    if (error) {
      setPending(false);
      setError(error.message || "Invalid email or password.");
      return;
    }
    router.push("/"); // the home page sends each role to its own portal
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <h2 className="text-2xl font-bold text-brand-800">Welcome back</h2>
        <p className="mt-1 text-sm text-slate-500">Sign in to your SAU HR Portal account</p>
      </div>
      {notice ? <Alert tone="info">{notice}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">Email address</label>
        <Input id="email" type="email" autoComplete="username" required placeholder="you@saus.edu.pk" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
          <Link href="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">Forgot password?</Link>
        </div>
        <div className="relative">
          <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pr-10" />
          <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((v) => !v)} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-slate-700">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending || !email || !password}>{pending ? "Signing in..." : "Sign in"}</Button>
      <p className="text-center text-xs text-slate-500">Accounts are created by the HR office. Contact them if you cannot sign in.</p>
    </form>
  );
}
