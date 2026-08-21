import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { getDiscoveryProvider } from "@/lib/discovery/registry";
import { leadFinderCriteriaSchema } from "@/lib/validation/leads";

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = await request.json();
    const criteria = leadFinderCriteriaSchema.parse(body);

    const provider = getDiscoveryProvider();
    const discovered = await provider.discover(criteria);

    const createdLeadIds: string[] = [];

    for (const item of discovered) {
      const company = await prisma.company.create({
        data: {
          name: item.name,
          website: item.website,
          industry: item.industry,
          country: item.country,
          city: item.city,
          sizeMin: item.sizeMin,
          sizeMax: item.sizeMax,
          description: item.description,
          isDemo: item.isDemo,
        },
      });

      let contactId: string | undefined;
      if (item.contactName || item.contactEmail) {
        const contact = await prisma.contact.create({
          data: {
            companyId: company.id,
            name: item.contactName,
            role: item.contactRole,
            email: item.contactEmail,
            linkedinUrl: item.linkedinUrl,
            source: item.source,
            isDemo: item.isDemo,
          },
        });
        contactId = contact.id;
      }

      const lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          contactId,
          source: item.source,
          status: "RESEARCH",
          pipelineStatus: "QUEUED",
          isDemo: item.isDemo,
        },
      });

      createdLeadIds.push(lead.id);
      await logActivity({ action: "lead_created", leadId: lead.id, meta: { source: item.source } });
    }

    return NextResponse.json({ createdLeadIds, count: createdLeadIds.length, providerName: provider.name });
  } catch (error) {
    return handleApiError(error);
  }
}
