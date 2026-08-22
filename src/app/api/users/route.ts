import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { createUserSchema } from "@/lib/validation/users";

const SELECT = { id: true, email: true, name: true, role: true, createdAt: true } as const;

export async function GET() {
  try {
    await requireSession();
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, select: SELECT });
    return NextResponse.json({ users });
  } catch (error) {
    return handleApiError(error);
  }
}

// Admin/host creates every login (spec: no public sign-up) — any signed-in
// user can add another, matching the single-tenant "the host manages
// access" model. Requires a session same as every other route here.
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const data = createUserSchema.parse(await request.json());
    const email = data.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError("A user with this email already exists.", 409);

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { email, name: data.name || null, passwordHash, role: "ADMIN" },
      select: SELECT,
    });

    await logActivity({ action: "settings_updated", userId: session.user.id, meta: { userCreated: user.email } });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
