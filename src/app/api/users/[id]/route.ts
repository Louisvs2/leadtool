import { NextResponse } from "next/server";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;

    if (id === session.user.id) {
      throw new ApiError("You can't remove your own account while signed in as it.", 400);
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new ApiError("User not found", 404);

    const total = await prisma.user.count();
    if (total <= 1) {
      throw new ApiError("At least one user must remain — add another login before removing this one.", 400);
    }

    await prisma.user.delete({ where: { id } });
    await logActivity({ action: "settings_updated", userId: session.user.id, meta: { userRemoved: existing.email } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
