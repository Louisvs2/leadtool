import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { manualLeadSchema } from "@/lib/validation/leads";
import { findLeads } from "@/lib/leads/queries";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);

    const leads = await findLeads({
      status: searchParams.get("status") ?? undefined,
      minScore: searchParams.get("minScore") ?? undefined,
      industry: searchParams.get("industry") ?? undefined,
      country: searchParams.get("country") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      campaignId: searchParams.get("campaignId") ?? undefined,
      includeDemo: searchParams.get("includeDemo") !== "false",
    });

    return NextResponse.json({ leads });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = await request.json();
    const data = manualLeadSchema.parse(body);

    const company = await prisma.company.create({
      data: {
        name: data.companyName,
        website: data.website || null,
        industry: data.industry || null,
        country: data.country || null,
        city: data.city || null,
        sizeMin: data.companySizeMin ?? null,
        sizeMax: data.companySizeMax ?? null,
        description: data.description || null,
        isDemo: false,
      },
    });

    let contactId: string | undefined;
    if (data.contactName || data.contactEmail || data.contactRole) {
      const contact = await prisma.contact.create({
        data: {
          companyId: company.id,
          name: data.contactName || null,
          role: data.contactRole || null,
          email: data.contactEmail || null,
          linkedinUrl: data.linkedinUrl || null,
          source: "manual",
          isDemo: false,
        },
      });
      contactId = contact.id;
    }

    const lead = await prisma.lead.create({
      data: {
        companyId: company.id,
        contactId,
        source: "manual",
        status: "RESEARCH",
        pipelineStatus: "QUEUED",
        opportunityValue: data.opportunityValue,
        isDemo: false,
      },
    });

    await logActivity({ action: "lead_created", leadId: lead.id, meta: { source: "manual" } });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
