import { NextRequest, NextResponse } from "next/server";
import { isPostgresAvailable, prisma } from "@/lib/prisma";
import { memoryStore } from "@/lib/memory-store";
import { getDateStringOffset } from "@/lib/seed-data";

export async function GET(
  _req: NextRequest,
  context: { params: { trainNumber: string } }
) {
  try {
    const trainNumber = context.params.trainNumber.trim();
    if (!(await isPostgresAvailable())) {
      return NextResponse.json(memoryStore.getCoachMap(trainNumber));
    }

    const today = getDateStringOffset(0);
    const train = await prisma.train.findUnique({
      where: { trainNumber },
      include: {
        coaches: {
          orderBy: { rakePosition: "asc" },
          include: { seats: { orderBy: { berthNumber: "asc" } } },
        },
        schedules: {
          where: { journeyDate: new Date(`${today}T00:00:00.000Z`) },
          include: {
            bookings: {
              where: { bookingStatus: { not: "CANCELLED" } },
              include: { passengers: true },
            },
          },
        },
      },
    });

    if (!train) {
      return NextResponse.json({ error: `Train ${trainNumber} not found.` }, { status: 404 });
    }

    const bookedSeatMap = new Map<string, { passengerName: string; pnr: string }>();
    for (const b of train.schedules[0]?.bookings ?? []) {
      for (const p of b.passengers) {
        if (p.currentStatus !== "CAN" && p.allocatedCoach && p.allocatedBerth) {
          bookedSeatMap.set(`${p.allocatedCoach}_${p.allocatedBerth}`, {
            passengerName: p.name,
            pnr: b.pnr,
          });
        }
      }
    }

    const coaches = train.coaches.map((c) => ({
      id: c.id,
      trainNumber: c.trainNumber,
      coachCode: c.coachCode,
      coachClass: c.coachClass,
      rakePosition: c.rakePosition,
      totalBerths: c.totalBerths,
      seats: c.seats.map((s) => {
        const booked = bookedSeatMap.get(`${c.coachCode}_${s.berthNumber}`);
        return {
          ...s,
          occupied: Boolean(booked),
          passengerName: booked?.passengerName,
          pnr: booked?.pnr,
        };
      }),
    }));

    return NextResponse.json({
      trainNumber: train.trainNumber,
      trainName: train.trainName,
      coaches,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch coach map." },
      { status: 500 }
    );
  }
}
