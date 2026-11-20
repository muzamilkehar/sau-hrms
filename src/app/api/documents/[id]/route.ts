import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { AppError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { getDocumentForDownload } from "@/modules/documents/service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const doc = await getDocumentForDownload(user, (await ctx.params).id);
    return new NextResponse(new Uint8Array(doc.data), {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
      },
    });
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof NotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
