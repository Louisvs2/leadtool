import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { noteSchema } from "@/lib/validation/leads";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const data = noteSchema.parse(await request.json());

    const note = await prisma.note.create({ data: { leadId: id, body: data.body } });
    await logActivity({ action: "note_added", leadId: id });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
