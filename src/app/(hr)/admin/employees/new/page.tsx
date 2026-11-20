import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { todayKey } from "@/lib/dates";
import { ActionForm } from "@/components/forms/action-form";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createEmployeeAction } from "../actions";
import { EmployeeFields } from "../employee-fields";

export const metadata: Metadata = { title: "Add employee" };

export default async function NewEmployeePage() {
  await requireRole("HR_ADMIN");
  return (
    <div>
      <PageHeader title="Add employee" breadcrumbs={[{ label: "Employee Directory", href: "/admin/employees" }, { label: "Add" }]} description="An employee ID and a temporary password are generated. The password is shown once; the employee must change it at first sign-in." />
      <Card>
        <CardBody>
          <ActionForm action={createEmployeeAction} submitLabel="Create employee" pendingLabel="Creating...">
            <EmployeeFields withAccount defaults={{ joiningDate: todayKey() }} />
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
