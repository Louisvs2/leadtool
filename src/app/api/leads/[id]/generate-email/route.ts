import { NextResponse } from "next/server";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { runLeadResearch } from "@/lib/research/engine";
import { buildLeadContext } from "@/lib/leads/context";
import { generateAllEmailVariants } from "@/lib/email/generator";
import { runEmailQualityCheck } from "@/lib/email/quality-check";
import { getSettings } from "@/lib/settings";
import { buildPitchTrackingUrl } from "@/lib/pitch";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;

    const lead = await prisma.lead.findUnique({ where: { id }, include: { contact: true } });
    if (!lead) throw new ApiError("Lead not found", 404);
    if (!lead.contact?.email) throw new ApiError("NO CONTACT FOUND — this lead has no business email on file.", 422);
    if (lead.doNotContact) throw new ApiError("This lead is scored below 60 (DO NOT CONTACT) and cannot be emailed.", 422);

    if (lead.pipelineStatus !== "READY") {
      const result = await runLeadResearch(id);
      if (!result.success) throw new ApiError(`Research failed: ${result.error}`, 500);
    }

    const built = await buildLeadContext(id);
    if (!built?.summary) throw new ApiError("Research summary unavailable — try running research again.", 500);

    const settings = await getSettings();
    const senderSettings = {
      senderName: settings.senderName,
      pitchUrl: buildPitchTrackingUrl(id),
      positioning: settings.positioning,
      capabilities: settings.capabilities,
      signature: settings.signature,
      unsubscribeText: settings.unsubscribeText,
    };

    const variants = await generateAllEmailVariants(built.context, built.summary, senderSettings);

    await prisma.emailMessage.deleteMany({ where: { leadId: id, type: "INITIAL", status: "DRAFT" } });

    const created = [];
    for (const key of ["A", "B", "C"] as const) {
      const variant = variants[key];
      const qc = await runEmailQualityCheck({ subject: variant.subject, body: variant.body, type: "INITIAL", context: built.context });
      const message = await prisma.emailMessage.create({
        data: {
          leadId: id,
          type: "INITIAL",
          variant: key,
          toEmail: lead.contact.email,
          subject: variant.subject,
          body: variant.body,
          angle: variant.angle,
          confidence: variant.confidence,
          sources: JSON.stringify(variant.sources),
          qualityCheck: JSON.stringify(qc),
          status: "DRAFT",
        },
      });
      created.push(message);
    }

    await logActivity({ action: "email_generated", leadId: id, meta: { variants: created.map((m) => m.variant) } });

    return NextResponse.json({ messages: created });
  } catch (error) {
    return handleApiError(error);
  }
}
