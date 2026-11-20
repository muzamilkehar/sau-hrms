import Link from "next/link";

export const metadata = { title: "Access denied" };

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold text-brand-700">403</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Access denied</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">You do not have permission to open this page.</p>
      <Link href="/" className="mt-6 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">Go to my home page</Link>
    </div>
  );
}
