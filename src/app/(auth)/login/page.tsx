import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);
  if (user) redirect(homeFor(user.role));
  return <LoginForm notice={sp.reason === "expired" ? "Your session ended for security reasons. Please sign in again." : undefined} />;
}
