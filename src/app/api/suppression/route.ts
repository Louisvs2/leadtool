import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { addToSuppressionList } from "@/lib/sending/guard";

const schema = z.object({ email: z.string().email(), note: z.string().optional() });

export async function GET() {
  try {
    await requireSession();
    const entries = await prisma.suppressionEntry.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ entries });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const { email, note } = schema.parse(await request.json());
    await addToSuppressionList(email, "manual", note);
    const entries = await prisma.suppressionEntry.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ entries }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
