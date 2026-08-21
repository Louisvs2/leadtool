import { NextResponse } from "next/server";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { runLeadResearch } from "@/lib/research/engine";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new ApiError("Lead not found", 404);

    const result = await runLeadResearch(id);
    if (!result.success) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 200 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
