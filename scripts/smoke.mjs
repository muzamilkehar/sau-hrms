/**
 * End-to-end smoke test against a RUNNING app (npm run build && npm start, or npm run dev).
 *   BASE_URL=http://localhost:3000 HR_EMAIL=... HR_PASSWORD=... EMP_EMAIL=... EMP_PASSWORD=... node scripts/smoke.mjs
 * Needs the demo data (SEED_DEMO_DATA=true). It only reads pages, plus signs in/out and makes failed sign-ins on a made-up address.
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const HR = { email: process.env.HR_EMAIL ?? "hr@saus.edu.pk", password: process.env.HR_PASSWORD };
const EMP = { email: process.env.EMP_EMAIL ?? "ayesha.khan@saus.edu.pk", password: process.env.EMP_PASSWORD };
if (!HR.password || !EMP.password) throw new Error("Set HR_PASSWORD and EMP_PASSWORD");

let failed = 0;
const ok = (cond, label, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`); if (!cond) failed++; };

class Client {
  jar = new Map();
  header() { return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; "); }
  store(res) {
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      const name = pair.slice(0, i), value = pair.slice(i + 1);
      if (!value || /max-age=0/i.test(c)) this.jar.delete(name); else this.jar.set(name, value);
    }
  }
  ip = "";
  async req(path, { method = "GET", json } = {}) {
    const res = await fetch(BASE + path, { method, redirect: "manual", headers: { Cookie: this.header(), Origin: BASE, ...(this.ip ? { "x-forwarded-for": this.ip } : {}), ...(json ? { "Content-Type": "application/json" } : {}) }, body: json ? JSON.stringify(json) : undefined });
    this.store(res);
    return res;
  }
  async signIn({ email, password }) {
    const r = await this.req("/api/auth/sign-in/email", { method: "POST", json: { email, password } });
    return r.status === 200;
  }
}
const loc = (r) => r.headers.get("location") ?? "";
const redirects = (r) => [307, 308].includes(r.status);

// ---- public surface
const anon = new Client();
let r = await anon.req("/api/health");
ok(r.status === 200, "health endpoint");
r = await anon.req("/login");
const csp = r.headers.get("content-security-policy") ?? "";
ok(r.status === 200 && /script-src[^;]*'nonce-/.test(csp) && csp.includes("frame-ancestors 'none'"), "login page with nonce CSP");
ok(r.headers.get("x-frame-options") === "DENY" && r.headers.get("x-content-type-options") === "nosniff" && !r.headers.get("x-powered-by"), "security headers");
r = await anon.req("/logo.png");
ok(r.status === 200 && (r.headers.get("content-type") ?? "").includes("image/png"), "logo is public");
for (const p of ["/admin", "/admin/payroll", "/app", "/app/salary", "/api/documents/x", "/api/employees/x/avatar"]) {
  r = await anon.req(p);
  ok(redirects(r) && loc(r).includes("/login"), `signed-out ${p} goes to login`);
}
r = await anon.req("/api/auth/sign-in/email", { method: "POST", json: { email: HR.email, password: "definitely-wrong-Password-1" } });
ok(r.status >= 400, "wrong password rejected", (await r.json().catch(() => ({}))).message ?? "");

// ---- HR/Admin
const hr = new Client();
ok(await hr.signIn(HR), "HR/Admin signs in");
r = await hr.req("/");
ok(redirects(r) && loc(r).endsWith("/admin"), "HR is sent to the admin console", loc(r));
const hrPages = ["/admin", "/admin/employees", "/admin/employees/new", "/admin/employees?q=EMP001", "/admin/attendance", "/admin/attendance?status=ABSENT", "/admin/attendance?status=HALF_DAY&from=2026-01-01&to=2026-12-31", "/admin/leave", "/admin/leave?status=ALL", "/admin/leave?status=APPROVED", "/admin/payroll", "/admin/payroll?q=ayesha", "/account/password"];
for (const p of hrPages) {
  r = await hr.req(p);
  const html = r.status === 200 ? await r.text() : "";
  ok(r.status === 200 && !/Application error|Something went wrong/.test(html), `HR page ${p}`, r.status === 200 ? "" : `status ${r.status} ${loc(r)}`);
}
r = await hr.req("/admin/employees?q=EMP001");
let html = await r.text();
ok(html.includes("Ayesha") && !html.includes("Bilal"), "directory search by employee ID filters the list");
r = await hr.req("/admin/payroll");
html = await r.text();
ok(html.includes("PKR 85,000") && html.includes("Net"), "payroll shows PKR amounts");
for (const p of ["/app", "/app/profile", "/app/leave", "/app/salary"]) {
  r = await hr.req(p);
  ok(redirects(r) && loc(r).endsWith("/admin"), `HR cannot use employee page ${p}`, loc(r));
}

// ---- Employee
const emp = new Client();
ok(await emp.signIn(EMP), "employee signs in");
r = await emp.req("/");
ok(redirects(r) && loc(r).endsWith("/app"), "employee is sent to the employee portal", loc(r));
for (const p of ["/app", "/app/profile", "/app/attendance", "/app/leave", "/app/salary", "/account/password"]) {
  r = await emp.req(p);
  html = r.status === 200 ? await r.text() : "";
  ok(r.status === 200 && !/Application error|Something went wrong/.test(html), `employee page ${p}`, r.status === 200 ? "" : `status ${r.status} ${loc(r)}`);
}
r = await emp.req("/app/salary");
html = await r.text();
ok(html.includes("Net monthly pay") && html.includes("PKR 85,000"), "employee sees their own salary");
ok(!html.includes("PKR 60,000"), "employee does not see anyone else's salary");
r = await emp.req("/app/leave");
html = await r.text();
ok(html.includes("Leave history") && html.includes("Rejected") && html.includes("We cannot accept leave approvals right now."), "leave history shows the rejected request with HR remarks");
r = await emp.req("/app/attendance");
html = await r.text();
ok(html.includes("Check in") && html.includes("Check out") && /Present|Half-Day/.test(html), "attendance shows buttons and history");
for (const p of ["/admin", "/admin/employees", "/admin/payroll", "/admin/leave", "/admin/attendance", "/admin/employees/new"]) {
  r = await emp.req(p);
  ok(redirects(r) && loc(r).endsWith("/app"), `employee cannot open ${p}`, loc(r));
}
r = await emp.req("/api/employees/does-not-exist/avatar");
ok(r.status === 404, "avatar endpoint does not leak other people's photos");
r = await emp.req("/api/documents/does-not-exist");
ok(r.status === 404, "document endpoint returns 404 for unknown or foreign documents");

// ---- sign-out and lockout
r = await emp.req("/api/auth/sign-out", { method: "POST", json: {} });
emp.jar.clear();
r = await emp.req("/app");
ok(redirects(r), "signed-out employee is redirected");
const target = process.env.LOCKOUT_EMAIL;
if (target) {
  const t = new Client();
  t.ip = "10.99.99.99"; // its own address, so the per-IP sign-in rate limit (8 per minute) is not shared with the checks above
  for (let i = 0; i < 5; i++) await t.req("/api/auth/sign-in/email", { method: "POST", json: { email: target, password: "wrong-Password-123" } });
  r = await t.req("/api/auth/sign-in/email", { method: "POST", json: { email: target, password: process.env.LOCKOUT_PASSWORD ?? "x" } });
  const body = await r.json().catch(() => ({}));
  ok(r.status === 403 && /Too many failed attempts/.test(body.message ?? ""), "account locks after 5 failed attempts", body.message ?? "");
}
console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
