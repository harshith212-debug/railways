import { NextRequest, NextResponse } from "next/server";
import { isPostgresAvailable, prisma } from "@/lib/prisma";
import { memoryStore } from "@/lib/memory-store";
import { generateComplaintRef } from "@/lib/railway-logic";
import { SEED_USER } from "@/lib/seed-data";
import { ComplaintCategoryCode } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pnr, trainNumber, category, description, coachNumber } = body as {
      pnr?: string | null;
      trainNumber: string;
      category: ComplaintCategoryCode;
      description: string;
      coachNumber?: string | null;
    };

    if (!trainNumber || !category || !description?.trim()) {
      return NextResponse.json({ error: "Train number, category, and description are required." }, { status: 400 });
    }

    if (!(await isPostgresAvailable())) {
      const complaint = memoryStore.createRailMadadComplaint({
        pnr,
        trainNumber,
        category,
        description,
        coachNumber,
      });
      return NextResponse.json({ complaint });
    }

    const train = await prisma.train.findUnique({ where: { trainNumber } });
    if (!train) {
      return NextResponse.json({ error: "Invalid train number." }, { status: 400 });
    }

    const created = await prisma.railMadadComplaint.create({
      data: {
        referenceNo: generateComplaintRef(),
        userId: SEED_USER.id,
        pnr: pnr || null,
        trainNumber,
        category,
        description: description.trim(),
        coachNumber: coachNumber || null,
        status: "ASSIGNED",
        resolution: "Assigned to On-Board Housekeeping / Train Superintendent (TS).",
      },
    });

    return NextResponse.json({
      complaint: {
        ...created,
        trainName: train.trainName,
        createdAt: created.createdAt.toISOString(),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to file Rail Madad complaint." },
      { status: 400 }
    );
  }
}
