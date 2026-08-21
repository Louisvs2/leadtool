import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/api-helpers";
import { getDashboardStats } from "@/lib/dashboard/stats";

export async function GET() {
  try {
    await requireSession();
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
