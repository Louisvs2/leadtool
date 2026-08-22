import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

export async function DELETE() {
  try {
    const session = await requireSession();

    // Deleting the demo Companies cascades (schema onDelete: Cascade) to
    // their Contacts, Leads, research, scores, and any campaign/message
    // rows a demo lead was added to — nothing real is touched, since every
    // demo record is flagged isDemo: true end-to-end from the seed.
    const { count } = await prisma.company.deleteMany({ where: { isDemo: true } });

    await logActivity({ action: "demo_data_cleared", userId: session.user.id, meta: { companiesDeleted: count } });

    return NextResponse.json({ ok: true, companiesDeleted: count });
  } catch (error) {
    return handleApiError(error);
  }
}
