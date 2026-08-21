import { prisma } from "../src/lib/prisma";
import { demoDiscoveryProvider } from "../src/lib/discovery/providers/demo";
import { runLeadResearch } from "../src/lib/research/engine";
import { logActivity } from "../src/lib/audit";

/**
 * Seeds the full demo company pool (24 clearly-fictional companies, spec
 * section 46) as real leads and runs them through the actual research →
 * score pipeline, so the app is fully explorable on first login. Every
 * record is flagged isDemo: true end-to-end (Company, Contact, Lead) — the
 * send guard (src/lib/sending/guard.ts) hard-blocks on this flag, so demo
 * leads can never actually be emailed, no matter what the UI allows.
 *
 * Deliberately does NOT fabricate sent emails, replies, or won
 * opportunities: those only ever get created by the real pipeline, so a
 * fresh install's dashboard accurately reflects that no campaign has been
 * sent yet rather than implying invented business results.
 */
export async function seedDemoData() {
  const existing = await prisma.lead.count({ where: { isDemo: true } });
  if (existing > 0) {
    console.log(`✔ Demo data already present (${existing} demo leads) — skipping`);
    return;
  }

  const companies = await demoDiscoveryProvider.discover({
    countries: [],
    industries: [],
    companySizeMin: 0,
    companySizeMax: 100_000,
    leadCount: 999,
    minQuality: 0,
    keywords: [],
  });

  console.log(`… seeding ${companies.length} demo leads`);

  const leadIds: string[] = [];

  for (const item of companies) {
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
        isDemo: true,
      },
    });

    const contact = await prisma.contact.create({
      data: {
        companyId: company.id,
        name: item.contactName,
        role: item.contactRole,
        email: item.contactEmail,
        linkedinUrl: item.linkedinUrl,
        source: item.source,
        isDemo: true,
      },
    });

    const lead = await prisma.lead.create({
      data: {
        companyId: company.id,
        contactId: contact.id,
        source: item.source,
        status: "RESEARCH",
        pipelineStatus: "QUEUED",
        isDemo: true,
      },
    });

    leadIds.push(lead.id);
    await logActivity({ action: "lead_created", leadId: lead.id, meta: { source: "demo_seed" } });
  }

  for (const leadId of leadIds) {
    await runLeadResearch(leadId);
  }

  // Give a handful of the strongest demo leads an illustrative opportunity
  // value so the pipeline/board views aren't empty — this is a *planning*
  // number the user would set themselves, not a fabricated sale.
  const topLeads = await prisma.lead.findMany({
    where: { isDemo: true, doNotContact: false },
    orderBy: { score: "desc" },
    take: 6,
  });
  const presetValues = [50000, 25000, 25000, 15000, 15000, 10000];
  for (let i = 0; i < topLeads.length; i += 1) {
    await prisma.lead.update({ where: { id: topLeads[i].id }, data: { opportunityValue: presetValues[i] } });
  }

  const qualified = await prisma.lead.count({ where: { isDemo: true, status: "QUALIFIED" } });
  const doNotContact = await prisma.lead.count({ where: { isDemo: true, doNotContact: true } });
  console.log(`✔ Seeded ${leadIds.length} demo leads (${qualified} qualified, ${doNotContact} below the contact threshold)`);
}
