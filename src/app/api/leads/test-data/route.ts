import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

/**
 * Deletes every Company whose name contains "test" (case-insensitive) —
 * for clearing out manually-created test leads (e.g. "Test GmbH") that
 * aren't part of the seeded demo set and so aren't covered by
 * DELETE /api/demo-data. Cascades (schema onDelete: Cascade) to each
 * company's contacts, leads, research, scores, and any campaign/message
 * rows, same as the demo-data clear.
 */
export async function DELETE() {
  try {
    const session = await requireSession();

    const { count } = await prisma.company.deleteMany({
      where: { name: { contains: "test", mode: "insensitive" } },
    });

    await logActivity({ action: "test_leads_cleared", userId: session.user.id, meta: { companiesDeleted: count } });

    return NextResponse.json({ ok: true, companiesDeleted: count });
  } catch (error) {
    return handleApiError(error);
  }
}
