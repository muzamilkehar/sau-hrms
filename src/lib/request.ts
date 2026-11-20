import { headers } from "next/headers";

export interface RequestInfo {
  ip: string | null;
  userAgent: string | null;
}

export function infoFromHeaders(h: Headers): RequestInfo {
  const forwarded = h.get("x-forwarded-for");
  const ip = (forwarded ? forwarded.split(",")[0]?.trim() : h.get("x-real-ip")) || null;
  return { ip, userAgent: h.get("user-agent") };
}

export async function getRequestInfo(): Promise<RequestInfo> {
  return infoFromHeaders(await headers());
}
