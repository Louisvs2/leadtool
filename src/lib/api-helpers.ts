import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("Unauthorized", 401);
  }
  return session;
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Validation failed", issues: error.flatten() }, { status: 422 });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
