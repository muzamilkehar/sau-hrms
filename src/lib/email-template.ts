export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function renderEmail(opts: { title: string; paragraphs: string[]; cta?: { label: string; url: string }; footnote?: string }) {
  const body = opts.paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1f2937">${escapeHtml(p)}</p>`).join("");
  const button = opts.cta ? `<p style="margin:22px 0"><a href="${escapeHtml(opts.cta.url)}" style="background:#7B1A3A;color:#fff;text-decoration:none;padding:11px 20px;border-radius:6px;font-size:14px;font-weight:600;display:inline-block">${escapeHtml(opts.cta.label)}</a></p>` : "";
  const note = opts.footnote ? `<p style="margin:18px 0 0;font-size:12px;color:#6b7280">${escapeHtml(opts.footnote)}</p>` : "";
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%"><tr><td align="center"><table role="presentation" width="560" style="background:#fff;border-radius:8px;overflow:hidden"><tr><td style="background:#7B1A3A;padding:18px 28px;color:#fff;font-size:16px;font-weight:700">SAU HR Portal &middot; The Shaikh Ayaz University</td></tr><tr><td style="padding:28px"><h1 style="margin:0 0 16px;font-size:20px;color:#7B1A3A">${escapeHtml(opts.title)}</h1>${body}${button}${note}</td></tr></table></td></tr></table></body></html>`;
  const text = [opts.title, "", ...opts.paragraphs, ...(opts.cta ? ["", `${opts.cta.label}: ${opts.cta.url}`] : []), ...(opts.footnote ? ["", opts.footnote] : [])].join("\n");
  return { subject: opts.title, html, text };
}
