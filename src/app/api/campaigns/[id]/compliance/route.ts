import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const schema = z.object({ confirmed: z.boolean() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const { confirmed } = schema.parse(await request.json());

    const campaign = await prisma.campaign.update({ where: { id }, data: { complianceConfirmed: confirmed } });
    return NextResponse.json({ campaign });
  } catch (error) {
    return handleApiError(error);
  }
}
