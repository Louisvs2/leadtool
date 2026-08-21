import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { recordReply } from "@/lib/reply/handler";

const schema = z.object({
  body: z.string().min(1),
  subject: z.string().optional(),
  fromEmail: z.string().email().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const data = schema.parse(await request.json());

    const lead = await prisma.lead.findUnique({ where: { id }, include: { contact: true } });
    if (!lead) throw new ApiError("Lead not found", 404);

    const fromEmail = data.fromEmail || lead.contact?.email;
    if (!fromEmail) throw new ApiError("This lead has no contact email on file.", 422);

    const reply = await recordReply({ leadId: id, fromEmail, subject: data.subject, body: data.body });

    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
