import { NextResponse } from "next/server";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { buildLeadContext } from "@/lib/leads/context";
import { generateInitialEmailVariant, generateFollowupEmail } from "@/lib/email/generator";
import { runEmailQualityCheck } from "@/lib/email/quality-check";
import { getSettings } from "@/lib/settings";
import { buildPitchTrackingUrl } from "@/lib/pitch";
import type { EmailVariantKey } from "@/types/domain";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;

    const existing = await prisma.emailMessage.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Message not found", 404);
    if (existing.status !== "DRAFT") throw new ApiError("Only draft messages can be regenerated.", 422);

    const built = await buildLeadContext(existing.leadId);
    if (!built?.summary) throw new ApiError("Research summary unavailable.", 500);

    const settings = await getSettings();
    const senderSettings = {
      senderName: settings.senderName,
      pitchUrl: buildPitchTrackingUrl(existing.leadId, existing.campaignId),
      positioning: settings.positioning,
      capabilities: settings.capabilities,
      signature: settings.signature,
      unsubscribeText: settings.unsubscribeText,
    };

    const generated =
      existing.type === "INITIAL"
        ? await generateInitialEmailVariant(built.context, built.summary, existing.variant as EmailVariantKey, senderSettings)
        : await generateFollowupEmail(
            built.context,
            built.summary,
            Number(existing.type.split("_")[1]) as 1 | 2 | 3,
            senderSettings,
            existing.subject,
          );

    const qc = await runEmailQualityCheck({ subject: generated.subject, body: generated.body, type: existing.type, context: built.context });

    const message = await prisma.emailMessage.update({
      where: { id },
      data: {
        subject: generated.subject,
        body: generated.body,
        angle: generated.angle,
        confidence: generated.confidence,
        sources: JSON.stringify(generated.sources),
        qualityCheck: JSON.stringify(qc),
        editedAt: new Date(),
      },
    });

    await logActivity({ action: "email_generated", leadId: message.leadId, meta: { regenerated: true, variant: message.variant } });

    return NextResponse.json({ message });
  } catch (error) {
    return handleApiError(error);
  }
}
