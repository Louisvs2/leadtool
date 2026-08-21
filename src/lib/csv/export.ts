import Papa from "papaparse";
import { formatDate } from "@/lib/utils";
import type { Lead, Company, Contact, CampaignLead, Campaign } from "@prisma/client";

type ExportableLead = Lead & {
  company: Company;
  contact: Contact | null;
  campaignLeads: (CampaignLead & { campaign: Campaign })[];
};

export function buildLeadsCsv(leads: ExportableLead[]): string {
  const rows = leads.map((lead) => ({
    Company: lead.company.name,
    Contact: lead.contact?.name ?? "",
    Email: lead.contact?.email ?? "",
    Score: lead.score ?? "",
    Status: lead.status,
    Campaign: lead.campaignLeads.map((cl) => cl.campaign.name).join("; "),
    "Last Contact": formatDate(lead.lastContactedAt),
    "Next Follow Up": formatDate(lead.nextFollowUpAt),
    Opportunity: lead.opportunityValue ?? "",
  }));

  return Papa.unparse(rows);
}
