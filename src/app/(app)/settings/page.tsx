import { PageHeader } from "@/components/shared/page-header";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { env, isAiConfigured } from "@/lib/env";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";

export default async function SettingsPage() {
  const [settings, suppressionEntries] = await Promise.all([
    getSettings(),
    prisma.suppressionEntry.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const providerStatus = {
    ai: isAiConfigured(),
    email: {
      mock: true,
      resend: Boolean(env.RESEND_API_KEY),
      sendgrid: Boolean(env.SENDGRID_API_KEY),
      smtp: Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD),
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="CultTwenty company profile, sending limits, providers and compliance." />
      <SettingsWorkspace settings={settings} suppressionEntries={suppressionEntries} providerStatus={providerStatus} />
    </div>
  );
}
