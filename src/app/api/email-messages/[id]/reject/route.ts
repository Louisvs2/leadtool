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

    const message = await prisma.emailMessage.update({ where: { id }, data: { status: "REJECTED" } });
    await logActivity({ action: "email_rejected", leadId: message.leadId, campaignId: message.campaignId ?? undefined });

    return NextResponse.json({ message });
  } catch (error) {
    return handleApiError(error);
  }
}
