import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const schema = z.object({ variant: z.enum(["A", "B", "C"]) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const { variant } = schema.parse(await request.json());

    const existing = await prisma.campaignLead.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Campaign lead not found", 404);

    const campaignLead = await prisma.campaignLead.update({ where: { id }, data: { selectedVariant: variant } });
    return NextResponse.json({ campaignLead });
  } catch (error) {
    return handleApiError(error);
  }
}
