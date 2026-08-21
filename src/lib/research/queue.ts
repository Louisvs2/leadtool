import { prisma } from "@/lib/prisma";
import { runLeadResearch } from "@/lib/research/engine";

/**
 * Processes a small batch of QUEUED leads synchronously and returns. Meant
 * to be called repeatedly (polled) from the client so large imports (spec
 * section 44, "500 leads") never run into a single request's execution
 * time limit — each call only does a few seconds of work.
 */
export async function processResearchQueue(batchSize = 3) {
  const queued = await prisma.lead.findMany({
    where: { pipelineStatus: "QUEUED" },
    orderBy: { createdAt: "asc" },
    take: batchSize,
    select: { id: true },
  });

  let succeeded = 0;
  let failed = 0;
  for (const lead of queued) {
    const result = await runLeadResearch(lead.id);
    if (result.success) succeeded += 1;
    else failed += 1;
  }

  const [remainingQueued, researching, ready, failedTotal] = await Promise.all([
    prisma.lead.count({ where: { pipelineStatus: "QUEUED" } }),
    prisma.lead.count({ where: { pipelineStatus: "RESEARCHING" } }),
    prisma.lead.count({ where: { pipelineStatus: "READY" } }),
    prisma.lead.count({ where: { pipelineStatus: "FAILED" } }),
  ]);

  return {
    processedThisBatch: succeeded + failed,
    succeeded,
    failed,
    remainingQueued,
    researching,
    ready,
    failedTotal,
    done: remainingQueued === 0 && researching === 0,
  };
}
