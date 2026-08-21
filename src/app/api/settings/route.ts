import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { settingsUpdateSchema } from "@/lib/validation/settings";
import { getSettings } from "@/lib/settings";

export async function GET() {
  try {
    await requireSession();
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    const data = settingsUpdateSchema.parse(await request.json());

    const settings = await prisma.settings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });

    await logActivity({ action: "settings_updated", userId: session.user.id });

    return NextResponse.json({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}
