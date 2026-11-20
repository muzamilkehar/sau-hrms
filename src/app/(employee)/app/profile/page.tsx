import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { dateToKey, formatKeyDate } from "@/lib/dates";
import { formatPKR } from "@/lib/format";
import { initials, titleCase } from "@/lib/utils";
import { getOwnProfile } from "@/modules/employees/service";
import { listDocuments } from "@/modules/documents/service";
import { netPay } from "@/modules/payroll/rules";
import { ActionForm, ConfirmSubmit, Field } from "@/components/forms/action-form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteDocumentAction, updateContactAction, uploadAvatarAction, uploadDocumentAction } from "./actions";

export const metadata: Metadata = { title: "My Profile" };

const Item = ({ label, value }: { label: string; value: string }) => (
  <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 text-sm font-semibold text-slate-900">{value}</dd></div>
);

export default async function ProfilePage() {
  const user = await requireRole("EMPLOYEE");
  const emp = await getOwnProfile(user);
  const docs = await listDocuments(emp.id);
  const sal = emp.salary ?? { basic: 0, hra: 0, allowances: 0, deductions: 0 };
  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {emp.avatarType ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/employees/${emp.id}/avatar`} alt="" width={80} height={80} className="size-20 rounded-full object-cover ring-2 ring-brand-100" />
            ) : (
              <span className="flex size-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">{initials(`${emp.firstName} ${emp.lastName}`)}</span>
            )}
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{emp.firstName} {emp.lastName}</h1>
              <p className="text-sm text-slate-500">{emp.user.email} &middot; {emp.employeeCode}</p>
            </div>
          </div>
          <ActionForm action={uploadAvatarAction} submitLabel="Change photo" pendingLabel="Uploading..." className="flex flex-wrap items-center gap-2 space-y-0">
            <input type="file" name="file" accept="image/png,image/jpeg,image/webp" required aria-label="Choose a photo (PNG, JPG or WebP, up to 1 MB)" className="max-w-56 text-xs text-slate-600 file:mr-2 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-2 file:py-1 file:text-xs" />
          </ActionForm>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Contact details (editable)" />
          <CardBody>
            <ActionForm action={updateContactAction} submitLabel="Save changes" pendingLabel="Saving...">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="firstName" label="First name" required><Input defaultValue={emp.firstName} /></Field>
                <Field name="lastName" label="Last name" required><Input defaultValue={emp.lastName} /></Field>
              </div>
              <Field name="phone" label="Phone"><Input defaultValue={emp.phone ?? ""} placeholder="+92 300 0000000" /></Field>
              <Field name="address" label="Address"><Input defaultValue={emp.address ?? ""} /></Field>
              <Field name="emergencyContact" label="Emergency contact" hint="Name and phone number"><Input defaultValue={emp.emergencyContact ?? ""} /></Field>
            </ActionForm>
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Job details" description="Managed by HR." />
            <CardBody><dl className="grid grid-cols-2 gap-4"><Item label="Designation" value={emp.designation} /><Item label="Department" value={emp.department} /><Item label="Joining date" value={formatKeyDate(dateToKey(emp.joiningDate))} /><Item label="Employment type" value={titleCase(emp.employmentType)} /></dl></CardBody>
          </Card>
          <Card>
            <CardHeader title="Salary structure" action={<Link href="/app/salary" className="text-sm font-medium text-brand-700 hover:underline">Details</Link>} />
            <CardBody>
              <dl className="grid grid-cols-2 gap-4"><Item label="Basic" value={formatPKR(sal.basic)} /><Item label="HRA" value={formatPKR(sal.hra)} /><Item label="Allowances" value={formatPKR(sal.allowances)} /><Item label="Deductions" value={sal.deductions ? `- ${formatPKR(sal.deductions)}` : formatPKR(0)} /></dl>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm"><span className="text-slate-600">Net monthly pay</span><span className="font-semibold text-emerald-700">{formatPKR(netPay(sal))}</span></div>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Documents" />
          {docs.length === 0 ? <CardBody><p className="text-sm text-slate-500">No documents uploaded.</p></CardBody> : (
            <ul className="divide-y divide-slate-100">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0"><a href={`/api/documents/${d.id}`} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium text-brand-700 hover:underline">{d.name}</a><p className="text-xs text-slate-400">{(d.size / 1024).toFixed(0)} KB</p></div>
                  <ActionForm action={deleteDocumentAction} hideSubmit className="space-y-0"><input type="hidden" name="id" value={d.id} /><ConfirmSubmit size="sm" message={`Delete ${d.name}?`}>Delete</ConfirmSubmit></ActionForm>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Upload a document" description="PDF or image (PNG, JPG, WebP), up to 4 MB." />
          <CardBody>
            <ActionForm action={uploadDocumentAction} submitLabel="Upload" pendingLabel="Uploading...">
              <input type="file" name="file" accept="application/pdf,image/png,image/jpeg,image/webp" required aria-label="Choose a file" className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm" />
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
