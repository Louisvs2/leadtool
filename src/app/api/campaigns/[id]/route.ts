import { NextResponse } from "next/server";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { campaignPitchUrlSchema } from "@/lib/validation/campaigns";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        campaignLeads: {
          include: {
            lead: { include: { company: true, contact: true, leadScore: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        emailMessages: { include: { events: true, replies: true } },
      },
    });
    if (!campaign) throw new ApiError("Campaign not found", 404);
    return NextResponse.json({ campaign });
  } catch (error) {
    return handleApiError(error);
  }
}

// The pitch link's actual destination is resolved live on every click (see
// /api/pitch), not baked into an already-sent email's body — so unlike the
// schedule fields, this stays editable after a campaign goes ACTIVE and
// fixes the link for messages already sent, not just future ones.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const { pitchUrl } = campaignPitchUrlSchema.parse(await request.json());

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new ApiError("Campaign not found", 404);

    const updated = await prisma.campaign.update({ where: { id }, data: { pitchUrl } });
    return NextResponse.json({ campaign: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new ApiError("Campaign not found", 404);

    // Deleting a campaign also stops anything still in flight for it —
    // sent messages/history are preserved (campaignId is nulled, not
    // deleted, via the schema's onDelete: SetNull), but nothing still
    // queued should go out after its campaign is gone.
    await prisma.emailMessage.updateMany({
      where: { campaignId: id, status: "QUEUED" },
      data: { status: "REJECTED", error: "Campaign deleted before send" },
    });
    await prisma.followup.updateMany({
      where: { campaignId: id, status: "SCHEDULED" },
      data: { status: "STOPPED", stopReason: "Campaign deleted" },
    });

    await prisma.campaign.delete({ where: { id } });

    await logActivity({ action: "campaign_deleted", userId: session.user.id, meta: { name: campaign.name } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
