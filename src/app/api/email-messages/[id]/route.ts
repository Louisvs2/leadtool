import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

const updateSchema = z.object({
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const message = await prisma.emailMessage.findUnique({
      where: { id },
      include: { lead: { include: { company: true, contact: true } }, events: true },
    });
    if (!message) throw new ApiError("Message not found", 404);
    return NextResponse.json({ message });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const data = updateSchema.parse(await request.json());

    const existing = await prisma.emailMessage.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Message not found", 404);
    if (existing.status !== "DRAFT") throw new ApiError("Only draft messages can be edited.", 422);

    const message = await prisma.emailMessage.update({
      where: { id },
      data: { subject: data.subject, body: data.body, editedAt: new Date() },
    });

    await logActivity({ action: "email_edited", leadId: message.leadId, campaignId: message.campaignId ?? undefined });

    return NextResponse.json({ message });
  } catch (error) {
    return handleApiError(error);
  }
}
