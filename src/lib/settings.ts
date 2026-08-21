import { prisma } from "@/lib/prisma";
import type { Settings } from "@prisma/client";

export async function getSettings(): Promise<Settings> {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  if (settings) return settings;
  return prisma.settings.create({ data: { id: "default" } });
}
