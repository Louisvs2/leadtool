import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { leadUpdateSchema } from "@/lib/validation/leads";
import { stopFollowupsForLead } from "@/lib/followups/scheduler";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        company: true,
        contact: true,
        researchFacts: { orderBy: { createdAt: "desc" } },
        researchSummary: true,
        leadScore: true,
        emailMessages: { orderBy: { createdAt: "desc" }, include: { events: true } },
        replies: { orderBy: { receivedAt: "desc" } },
        followups: { orderBy: { scheduledAt: "asc" } },
        opportunities: { orderBy: { createdAt: "desc" } },
        notes: { orderBy: { createdAt: "desc" } },
        activityLogs: { orderBy: { createdAt: "desc" }, take: 50 },
        campaignLeads: { include: { campaign: true } },
      },
    });
    if (!lead) throw new ApiError("Lead not found", 404);
    return NextResponse.json({ lead });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await request.json();
    const data = leadUpdateSchema.parse(body);

    const existing = await prisma.lead.findUnique({ where: { id }, include: { contact: true } });
    if (!existing) throw new ApiError("Lead not found", 404);

    const companyFields = {
      name: data.companyName,
      website: data.website,
      industry: data.industry,
      country: data.country,
      city: data.city,
      sizeMin: data.companySizeMin,
      sizeMax: data.companySizeMax,
      description: data.description,
    };
    if (Object.values(companyFields).some((v) => v !== undefined)) {
      await prisma.company.update({ where: { id: existing.companyId }, data: companyFields });
    }

    const contactFields = {
      name: data.contactName,
      role: data.contactRole,
      email: data.contactEmail === "" ? null : data.contactEmail,
      linkedinUrl: data.linkedinUrl,
    };
    if (Object.values(contactFields).some((v) => v !== undefined)) {
      if (existing.contactId) {
        await prisma.contact.update({ where: { id: existing.contactId }, data: contactFields });
      } else {
        const contact = await prisma.contact.create({
          data: { companyId: existing.companyId, source: "manual", isDemo: false, ...contactFields },
        });
        await prisma.lead.update({ where: { id }, data: { contactId: contact.id } });
      }
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        status: data.status,
        opportunityValue: data.opportunityValue,
        nextFollowUpAt: data.nextFollowUpAt === undefined ? undefined : data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
      },
    });

    if (data.status && data.status !== existing.status) {
      await logActivity({ action: "lead_status_changed", leadId: id, meta: { from: existing.status, to: data.status } });
      if (data.status === "REJECTED" || data.status === "DO_NOT_CONTACT" || data.status === "LOST") {
        await stopFollowupsForLead(id, `Lead marked ${data.status}.`);
      }
      if (data.status === "REJECTED") {
        await logActivity({ action: "lead_rejected", leadId: id });
      }
    }
    if (data.opportunityValue !== undefined) {
      await logActivity({ action: "opportunity_updated", leadId: id, meta: { value: data.opportunityValue } });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
