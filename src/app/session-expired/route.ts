import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await getAuth().api.signOut({ headers: await headers() });
  } catch {
    // already signed out
  }
  return NextResponse.redirect(new URL("/login?reason=expired", request.url));
}
