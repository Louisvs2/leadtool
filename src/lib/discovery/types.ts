export type LeadFinderCriteria = {
  countries: string[];
  industries: string[];
  companySizeMin: number;
  companySizeMax: number;
  leadCount: number;
  minQuality: number;
  keywords: string[];
};

export type DiscoveredCompany = {
  name: string;
  website: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  sizeMin: number | null;
  sizeMax: number | null;
  description: string | null;
  contactName: string | null;
  contactRole: string | null;
  contactEmail: string | null;
  linkedinUrl: string | null;
  source: string;
  isDemo: boolean;
};

export interface LeadDiscoveryProvider {
  readonly name: string;
  discover(criteria: LeadFinderCriteria): Promise<DiscoveredCompany[]>;
}
