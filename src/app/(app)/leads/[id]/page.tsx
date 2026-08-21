import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe, Link2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ScoreBadge } from "@/components/shared/score-badge";
import { LeadStatusBadge } from "@/components/shared/status-badge";
import { DemoBadge } from "@/components/shared/demo-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadHeaderActions } from "@/components/leads/lead-header-actions";
import { ResearchPanel } from "@/components/leads/research-panel";
import { ScoreBreakdown } from "@/components/leads/score-breakdown";
import { GenerateEmailPanel } from "@/components/leads/generate-email-panel";
import { LeadMessagesPanel } from "@/components/leads/lead-messages-panel";
import { LeadRepliesPanel } from "@/components/leads/lead-replies-panel";
import { LogReplyDialog } from "@/components/leads/log-reply-dialog";
import { NotesPanel } from "@/components/leads/notes-panel";
import { OpportunitySelector } from "@/components/leads/opportunity-selector";
import { LeadActivityTimeline } from "@/components/leads/lead-activity-timeline";
import { formatDate } from "@/lib/utils";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      company: true,
      contact: true,
      researchFacts: { orderBy: { createdAt: "desc" } },
      researchSummary: true,
      leadScore: true,
      emailMessages: { orderBy: { createdAt: "desc" } },
      replies: { orderBy: { receivedAt: "desc" } },
      followups: { orderBy: { scheduledAt: "asc" } },
      notes: { orderBy: { createdAt: "desc" } },
      activityLogs: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  if (!lead) notFound();

  const draftMessages = lead.emailMessages.filter((m) => m.type === "INITIAL" && m.status === "DRAFT");

  return (
    <div className="space-y-6">
      <Link href="/leads" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to leads
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <ScoreBadge score={lead.score} grade={lead.grade} size="lg" />
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{lead.company.name}</h1>
              <LeadStatusBadge status={lead.status} />
              {lead.isDemo && <DemoBadge />}
            </div>
            <p className="text-sm text-muted-foreground">
              {[lead.company.industry, lead.company.city, lead.company.country].filter(Boolean).join(" · ") || "No company details yet"}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {lead.company.website && (
                <a href={lead.company.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
                  <Globe className="size-3.5" /> Website
                </a>
              )}
              {lead.contact?.linkedinUrl && (
                <a href={lead.contact.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
                  <Link2 className="size-3.5" /> LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>
        <LeadHeaderActions leadId={lead.id} status={lead.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="outreach">Outreach</TabsTrigger>
              <TabsTrigger value="messages">Messages ({lead.emailMessages.length})</TabsTrigger>
              <TabsTrigger value="replies">Replies ({lead.replies.length})</TabsTrigger>
              <TabsTrigger value="notes">Notes ({lead.notes.length})</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-4">
              <ResearchPanel summary={lead.researchSummary} facts={lead.researchFacts} />
            </TabsContent>

            <TabsContent value="outreach" className="pt-4">
              <GenerateEmailPanel leadId={lead.id} drafts={draftMessages} />
            </TabsContent>

            <TabsContent value="messages" className="pt-4">
              <LeadMessagesPanel messages={lead.emailMessages} />
            </TabsContent>

            <TabsContent value="replies" className="space-y-3 pt-4">
              <div className="flex justify-end">
                <LogReplyDialog leadId={lead.id} />
              </div>
              <LeadRepliesPanel replies={lead.replies} />
            </TabsContent>

            <TabsContent value="notes" className="pt-4">
              <NotesPanel leadId={lead.id} notes={lead.notes} />
            </TabsContent>

            <TabsContent value="activity" className="pt-4">
              <LeadActivityTimeline logs={lead.activityLogs} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {lead.contact?.name ? (
                <>
                  <p className="font-medium">{lead.contact.name}</p>
                  <p className="text-muted-foreground">{lead.contact.role}</p>
                  <p className="text-muted-foreground">{lead.contact.email ?? "UNKNOWN"}</p>
                </>
              ) : (
                <p className="text-muted-foreground">NO CONTACT FOUND</p>
              )}
            </CardContent>
          </Card>

          {lead.leadScore && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Score breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreBreakdown score={lead.leadScore} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Opportunity value</CardTitle>
            </CardHeader>
            <CardContent>
              <OpportunitySelector leadId={lead.id} value={lead.opportunityValue} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm text-muted-foreground">
              <p>Last contacted: {formatDate(lead.lastContactedAt)}</p>
              <p>Next follow-up: {formatDate(lead.nextFollowUpAt)}</p>
              <p>Source: {lead.source}</p>
              <p>Created: {formatDate(lead.createdAt)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
