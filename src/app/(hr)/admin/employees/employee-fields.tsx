import { Field } from "@/components/forms/action-form";
import { Input, Select } from "@/components/ui/input";

export interface EmployeeDefaults {
  firstName?: string; lastName?: string; email?: string; role?: string; designation?: string; department?: string;
  joiningDate?: string; employmentType?: string; phone?: string | null; address?: string | null; emergencyContact?: string | null;
}

export function EmployeeFields({ defaults, withAccount }: { defaults?: EmployeeDefaults; withAccount?: boolean }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="firstName" label="First name" required><Input defaultValue={defaults?.firstName} /></Field>
        <Field name="lastName" label="Last name" required><Input defaultValue={defaults?.lastName} /></Field>
        {withAccount ? <Field name="email" label="Official email" required hint="This is the sign-in name."><Input type="email" defaultValue={defaults?.email} autoComplete="off" /></Field> : null}
        {withAccount ? (
          <Field name="role" label="Access" required hint="HR/Admin can manage everyone. Employees see only their own data.">
            <Select defaultValue={defaults?.role ?? "EMPLOYEE"}><option value="EMPLOYEE">Employee</option><option value="HR_ADMIN">HR/Admin</option></Select>
          </Field>
        ) : null}
        <Field name="department" label="Department" required><Input defaultValue={defaults?.department} placeholder="e.g. Computer Science" /></Field>
        <Field name="designation" label="Designation" required><Input defaultValue={defaults?.designation} placeholder="e.g. Lecturer" /></Field>
        <Field name="joiningDate" label="Joining date" required><Input type="date" defaultValue={defaults?.joiningDate} /></Field>
        <Field name="employmentType" label="Employment type" required>
          <Select defaultValue={defaults?.employmentType ?? "FULL_TIME"}><option value="FULL_TIME">Full-time</option><option value="PART_TIME">Part-time</option><option value="CONTRACT">Contract</option></Select>
        </Field>
        <Field name="phone" label="Phone"><Input defaultValue={defaults?.phone ?? ""} placeholder="+92 300 0000000" /></Field>
        <Field name="emergencyContact" label="Emergency contact"><Input defaultValue={defaults?.emergencyContact ?? ""} /></Field>
      </div>
      <Field name="address" label="Address"><Input defaultValue={defaults?.address ?? ""} /></Field>
    </>
  );
}
