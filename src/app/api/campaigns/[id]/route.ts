import { NextResponse } from "next/server";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        campaignLeads: {
          include: {
            lead: { include: { company: true, contact: true, leadScore: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        emailMessages: { include: { events: true, replies: true } },
      },
    });
    if (!campaign) throw new ApiError("Campaign not found", 404);
    return NextResponse.json({ campaign });
  } catch (error) {
    return handleApiError(error);
  }
}
