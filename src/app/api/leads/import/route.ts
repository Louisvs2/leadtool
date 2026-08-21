import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { parseCsvText, importLeadsFromCsv } from "@/lib/csv/import";

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ApiError("No CSV file uploaded.", 400);

    const text = await file.text();
    const { rows, errors } = parseCsvText(text);
    if (rows.length === 0) throw new ApiError("CSV file has no data rows.", 400);

    const summary = await importLeadsFromCsv(rows);

    return NextResponse.json({ ...summary, parseErrors: errors });
  } catch (error) {
    return handleApiError(error);
  }
}
