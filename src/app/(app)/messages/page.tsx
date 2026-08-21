import Link from "next/link";
import { Mail } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EmailStatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const messages = await prisma.emailMessage.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { lead: { include: { company: true } }, campaign: true },
  });

  const STATUS_FILTERS = ["DRAFT", "APPROVED", "QUEUED", "SENT", "DELIVERED", "BOUNCED", "FAILED", "REJECTED"];

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description={`${messages.length} message${messages.length === 1 ? "" : "s"}`} />

      <div className="flex flex-wrap gap-1.5">
        <Link href="/messages">
          <Badge variant={!status ? "default" : "outline"} className="cursor-pointer">
            All
          </Badge>
        </Link>
        {STATUS_FILTERS.map((s) => (
          <Link key={s} href={`/messages?status=${s}`}>
            <Badge variant={status === s ? "default" : "outline"} className="cursor-pointer">
              {s}
            </Badge>
          </Link>
        ))}
      </div>

      {messages.length === 0 ? (
        <EmptyState icon={Mail} title="No messages" description="Generated and sent messages will show up here." />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Company</th>
                <th className="px-4 py-2.5 text-left font-medium">Subject</th>
                <th className="px-4 py-2.5 text-left font-medium">Type</th>
                <th className="px-4 py-2.5 text-left font-medium">Campaign</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-2.5">
                    <Link href={`/leads/${m.leadId}`} className="font-medium hover:underline">
                      {m.lead.company.name}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-4 py-2.5">{m.subject}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{m.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {m.campaign ? <Link href={`/campaigns/${m.campaign.id}`} className="hover:underline">{m.campaign.name}</Link> : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <EmailStatusBadge status={m.status} />
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDateTime(m.sentAt ?? m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
