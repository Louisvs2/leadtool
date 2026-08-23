import Papa from "papaparse";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

const csvRowSchema = z.object({
  company: z.string().min(1),
  website: z.string().optional().default(""),
  industry: z.string().optional().default(""),
  contact_name: z.string().optional().default(""),
  contact_role: z.string().optional().default(""),
  email: z.string().optional().default(""),
  linkedin: z.string().optional().default(""),
  country: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export type CsvImportRowResult = {
  row: number;
  company: string;
  status: "created" | "skipped" | "invalid_email" | "error";
  message?: string;
  leadId?: string;
};

export type CsvImportSummary = {
  totalRows: number;
  created: number;
  skipped: number;
  invalidEmail: number;
  errors: number;
  results: CsvImportRowResult[];
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Column names from common export tools (Apollo.io, LinkedIn Sales
// Navigator exports, etc.) mapped to our own field names, so a CSV doesn't
// have to be hand-relabeled to our exact template before importing.
const FIELD_ALIASES: Record<string, string[]> = {
  company: ["company", "company_name", "organization", "account_name"],
  website: ["website", "company_website"],
  industry: ["industry"],
  contact_role: ["contact_role", "title", "job_title", "position"],
  email: ["email", "email_address", "work_email"],
  linkedin: ["linkedin", "linkedin_url", "person_linkedin_url"],
  // Apollo has both the contact's own location ("country") and the
  // company's ("company_country") — the company's is what matters here.
  country: ["company_country", "country"],
  notes: ["notes"],
};

function firstNonEmpty(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value && value.trim()) return value.trim();
  }
  return "";
}

function normalizeRow(row: Record<string, string>): Record<string, string> {
  if (row.company) return row; // already matches our own template

  const normalized: Record<string, string> = {};
  for (const [target, aliases] of Object.entries(FIELD_ALIASES)) {
    const value = firstNonEmpty(row, aliases);
    if (value) normalized[target] = value;
  }

  // Apollo-style exports split the contact name into first_name/last_name
  // rather than a single "name" column.
  const contactName =
    firstNonEmpty(row, ["contact_name", "name"]) || [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  if (contactName) normalized.contact_name = contactName;

  return normalized;
}

export function parseCsvText(text: string): { rows: Record<string, string>[]; errors: string[] } {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });
  return {
    rows: parsed.data,
    errors: parsed.errors.map((e) => `Row ${e.row ?? "?"}: ${e.message}`),
  };
}

export async function importLeadsFromCsv(rawRows: Record<string, string>[]): Promise<CsvImportSummary> {
  const results: CsvImportRowResult[] = [];

  for (let i = 0; i < rawRows.length; i += 1) {
    const rowNum = i + 2; // header is row 1
    const normalizedRow = normalizeRow(rawRows[i]);
    const parsed = csvRowSchema.safeParse(normalizedRow);
    if (!parsed.success) {
      results.push({ row: rowNum, company: normalizedRow.company || "unknown", status: "error", message: "Missing required field: company" });
      continue;
    }
    const data = parsed.data;

    if (data.email && !isValidEmail(data.email)) {
      results.push({ row: rowNum, company: data.company, status: "invalid_email", message: `Invalid email: ${data.email}` });
      continue;
    }

    try {
      const company = await prisma.company.create({
        data: {
          name: data.company,
          website: data.website || null,
          industry: data.industry || null,
          country: data.country || null,
          isDemo: false,
        },
      });

      let contactId: string | undefined;
      if (data.contact_name || data.email || data.contact_role) {
        const contact = await prisma.contact.create({
          data: {
            companyId: company.id,
            name: data.contact_name || null,
            role: data.contact_role || null,
            email: data.email || null,
            linkedinUrl: data.linkedin || null,
            source: "csv_import",
            isDemo: false,
          },
        });
        contactId = contact.id;
      }

      const lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          contactId,
          source: "csv_import",
          status: "RESEARCH",
          pipelineStatus: "QUEUED",
          isDemo: false,
        },
      });

      if (data.notes) {
        await prisma.researchFact.create({
          data: {
            leadId: lead.id,
            factText: data.notes,
            sourceUrl: null,
            confidence: "HIGH",
            category: "other",
          },
        });
      }

      await logActivity({ action: "lead_imported", leadId: lead.id, meta: { source: "csv", company: data.company } });

      results.push({ row: rowNum, company: data.company, status: "created", leadId: lead.id });
    } catch (error) {
      results.push({
        row: rowNum,
        company: data.company,
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    totalRows: rawRows.length,
    created: results.filter((r) => r.status === "created").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    invalidEmail: results.filter((r) => r.status === "invalid_email").length,
    errors: results.filter((r) => r.status === "error").length,
    results,
  };
}
