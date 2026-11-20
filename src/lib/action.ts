import { z } from "zod";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { AppError, ValidationError } from "@/lib/errors";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export const fail = (error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> => ({ ok: false, error, fieldErrors });
export const success = <T = undefined>(data?: T, message?: string): ActionResult<T> => ({ ok: true, data, message });

/** Parses form data / objects with Zod and raises a ValidationError with per-field messages. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    throw new ValidationError("Please correct the highlighted fields.", fieldErrors);
  }
  return result.data;
}

export function formToObject(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    const all = form.getAll(key).filter((v) => typeof v === "string") as string[];
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
}

/** Wraps a server action body: converts known errors to results, lets redirects through. */
export async function run<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (isRedirectError(e)) throw e;
    if (e instanceof ValidationError) return fail(e.message, e.fieldErrors);
    if (e instanceof AppError) return fail(e.message);
    console.error("[action] unexpected error", e);
    return fail("Something went wrong. Please try again. If it continues, contact the administrator.");
  }
}

export const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/** State shared by every form action (what `useActionState` carries between submissions). */
export type FormState = ActionResult<{ tempPassword?: string; href?: string; hrefLabel?: string } | undefined> | null;
