import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/api-helpers";
import { processResearchQueue } from "@/lib/research/queue";

export async function POST() {
  try {
    await requireSession();
    const result = await processResearchQueue(3);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
