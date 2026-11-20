import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-navy-brand p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={48} height={48} priority className="size-14 rounded-full bg-white p-1 shadow-md" />
          <div>
            <p className="text-lg font-bold leading-tight">SAU HR Portal</p>
            <p className="text-sm text-brand-100">The Shaikh Ayaz University, Shikarpur</p>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Employee<br />Management System</h1>
          <p className="mt-4 max-w-md text-brand-100">Attendance, leave, payroll and employee records in one secure place.</p>
          <ul className="mt-8 space-y-2 text-sm text-brand-100">
            <li>Check in and out, apply for leave, view your salary</li>
            <li>HR approves leave and manages payroll</li>
            <li>Every account is created by the HR office</li>
          </ul>
        </div>
        <p className="text-xs text-brand-200">&copy; {new Date().getFullYear()} The Shaikh Ayaz University, Shikarpur</p>
      </section>
      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image src="/logo.png" alt="" width={40} height={40} />
            <p className="font-bold text-brand-800">SAU HR Portal</p>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
