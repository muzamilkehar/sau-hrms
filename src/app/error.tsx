"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">The request could not be completed. Please try again. If the problem continues, contact the administrator and quote the reference below.</p>
      {error.digest ? <p className="mt-3 rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">Ref: {error.digest}</p> : null}
      <button type="button" onClick={reset} className="mt-6 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">Try again</button>
    </div>
  );
}
