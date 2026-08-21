import { NextResponse } from "next/server";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;

    const existing = await prisma.emailMessage.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Message not found", 404);

    // Approving one variant rejects its siblings so exactly one INITIAL
    // message per lead ever reaches SENT (spec section 19: never the same
    // lead twice).
    if (existing.type === "INITIAL") {
      await prisma.emailMessage.updateMany({
        where: { leadId: existing.leadId, type: "INITIAL", id: { not: id }, status: "DRAFT" },
        data: { status: "REJECTED" },
      });
    }

    const message = await prisma.emailMessage.update({
      where: { id },
      data: { status: "APPROVED", approvedAt: new Date() },
    });

    await logActivity({ action: "email_approved", leadId: message.leadId, campaignId: message.campaignId ?? undefined, meta: { variant: message.variant } });

    return NextResponse.json({ message });
  } catch (error) {
    return handleApiError(error);
  }
}
