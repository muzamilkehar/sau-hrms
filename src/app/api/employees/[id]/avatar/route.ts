import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { getAvatar } from "@/modules/documents/service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { data, type } = await getAvatar(user, (await ctx.params).id);
    return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": type, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof NotFoundError) return new NextResponse(null, { status: 404 });
    throw e;
  }
}
