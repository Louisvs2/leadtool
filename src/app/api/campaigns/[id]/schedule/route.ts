import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { campaignScheduleSchema } from "@/lib/validation/campaigns";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const data = campaignScheduleSchema.parse(await request.json());

    const campaign = await prisma.campaign.update({ where: { id }, data });
    return NextResponse.json({ campaign });
  } catch (error) {
    return handleApiError(error);
  }
}
