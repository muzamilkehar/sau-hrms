import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { NotFoundError } from "@/lib/errors";
import { dateToKey } from "@/lib/dates";
import { formatDateTime, isFuture } from "@/lib/utils";
import { getEmployeeForHr } from "@/modules/employees/service";
import { ActionForm, ConfirmSubmit } from "@/components/forms/action-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { resetPasswordAction, setActiveAction, updateEmployeeAction } from "../actions";
import { EmployeeFields } from "../employee-fields";

export const metadata: Metadata = { title: "Employee" };

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("HR_ADMIN");
  const { id } = await params;
  let emp;
  try {
    emp = await getEmployeeForHr(user, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const self = emp.userId === user.userId;
  return (
    <div className="space-y-6">
      <PageHeader title={`${emp.firstName} ${emp.lastName}`} description={`${emp.employeeCode} \u00b7 ${emp.user.email}`} breadcrumbs={[{ label: "Employee Directory", href: "/admin/employees" }, { label: emp.employeeCode }]}
        actions={<>{emp.user.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}{emp.user.role === "HR_ADMIN" ? <Badge tone="gold">HR/Admin</Badge> : null}{isFuture(emp.user.lockedUntil) ? <Badge tone="danger">Locked</Badge> : null}</>} />
      <Card>
        <CardHeader title="Details" />
        <CardBody>
          <ActionForm action={updateEmployeeAction} submitLabel="Save changes" pendingLabel="Saving...">
            <input type="hidden" name="id" value={emp.id} />
            <EmployeeFields defaults={{ firstName: emp.firstName, lastName: emp.lastName, department: emp.department, designation: emp.designation, joiningDate: dateToKey(emp.joiningDate), employmentType: emp.employmentType, phone: emp.phone, address: emp.address, emergencyContact: emp.emergencyContact }} />
          </ActionForm>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Account" description={`Last sign-in: ${formatDateTime(emp.user.lastLoginAt)}${emp.user.mustChangePassword ? " \u00b7 has not yet replaced the temporary password" : ""}`} />
        <CardBody className="grid gap-6 md:grid-cols-2">
          {!self ? (
            <ActionForm action={resetPasswordAction} hideSubmit>
              <input type="hidden" name="id" value={emp.id} />
              <p className="text-sm text-slate-600">Create a new temporary password, unlock the account and sign the employee out everywhere.</p>
              <ConfirmSubmit message="Reset this employee's password? They will be signed out everywhere.">Reset password</ConfirmSubmit>
            </ActionForm>
          ) : null}
          {!self ? (
            <ActionForm action={setActiveAction} hideSubmit>
              <input type="hidden" name="id" value={emp.id} />
              <input type="hidden" name="active" value={emp.user.isActive ? "false" : "true"} />
              <p className="text-sm text-slate-600">{emp.user.isActive ? "Deactivate when the employee leaves. They are signed out immediately and cannot sign in." : "Allow this employee to sign in again."}</p>
              <ConfirmSubmit variant={emp.user.isActive ? "danger" : "primary"} message={emp.user.isActive ? "Deactivate this employee?" : "Reactivate this employee?"}>{emp.user.isActive ? "Deactivate" : "Reactivate"}</ConfirmSubmit>
            </ActionForm>
          ) : <p className="text-sm text-slate-500">This is your own account. Use Change password in the top bar.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
