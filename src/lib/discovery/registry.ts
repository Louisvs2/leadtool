import { env } from "@/lib/env";
import { demoDiscoveryProvider } from "@/lib/discovery/providers/demo";
import type { LeadDiscoveryProvider } from "@/lib/discovery/types";

/**
 * Provider registry for lead discovery. Ships with a Demo provider so the
 * full workflow (find → research → score → generate → approve → send) can
 * be exercised without any paid data source. To go live, implement a
 * provider against a data source you are licensed to use (a company-search
 * API, a CRM export, etc.) in `src/lib/discovery/providers/`, register it
 * here, and set LEAD_DISCOVERY_PROVIDER=custom.
 */
export function getDiscoveryProvider(): LeadDiscoveryProvider {
  if (env.LEAD_DISCOVERY_PROVIDER === "custom") {
    throw new Error(
      "LEAD_DISCOVERY_PROVIDER=custom is set but no custom provider is registered. " +
        "Implement one in src/lib/discovery/providers/ and wire it up in src/lib/discovery/registry.ts.",
    );
  }
  return demoDiscoveryProvider;
}
