import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/api-helpers";
import { processCampaignGeneration } from "@/lib/campaigns/generate-queue";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const result = await processCampaignGeneration(id, 3);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
