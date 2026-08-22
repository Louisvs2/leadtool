import { PageHeader } from "@/components/shared/page-header";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { maskSettingsForClient } from "@/lib/secrets";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";

export default async function SettingsPage() {
  const [settings, suppressionEntries, users, session, demoLeadCount] = await Promise.all([
    getSettings(),
    prisma.suppressionEntry.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),
    auth(),
    prisma.lead.count({ where: { isDemo: true } }),
  ]);

  const { settings: safeSettings, secrets } = maskSettingsForClient(settings);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="CultTwenty company profile, sending limits, API keys, team and compliance." />
      <SettingsWorkspace
        settings={safeSettings}
        secrets={secrets}
        suppressionEntries={suppressionEntries}
        users={users}
        currentUserId={session?.user?.id ?? ""}
        demoLeadCount={demoLeadCount}
      />
    </div>
  );
}
