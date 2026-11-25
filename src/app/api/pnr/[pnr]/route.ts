import { NextRequest, NextResponse } from "next/server";
import { isPostgresAvailable, prisma } from "@/lib/prisma";
import { memoryStore } from "@/lib/memory-store";
import { CLASS_DISPLAY_MAP } from "@/lib/railway-logic";

export async function GET(
  _req: NextRequest,
  context: { params: { pnr: string } }
) {
  try {
    const pnr = context.params.pnr.trim();
    if (!(await isPostgresAvailable())) {
      const booking = memoryStore.getPnr(pnr);
      if (!booking) {
        return NextResponse.json({ error: `PNR ${pnr} not found.` }, { status: 404 });
      }
      return NextResponse.json({ booking });
    }

    const b = await prisma.booking.findUnique({
      where: { pnr },
      include: {
        passengers: true,
        fromStn: true,
        toStn: true,
        schedule: { include: { train: { include: { routes: true } } } },
      },
    });

    if (!b) {
      return NextResponse.json({ error: `PNR ${pnr} not found.` }, { status: 404 });
    }

    const fromRoute = b.schedule.train.routes.find((r) => r.stationCode === b.fromStation);
    const toRoute = b.schedule.train.routes.find((r) => r.stationCode === b.toStation);

    return NextResponse.json({
      booking: {
        pnr: b.pnr,
        userId: b.userId,
        scheduleId: b.scheduleId,
        trainNumber: b.schedule.trainNumber,
        trainName: b.schedule.train.trainName,
        trainType: b.schedule.train.trainType,
        journeyDate: b.schedule.journeyDate.toISOString().slice(0, 10),
        fromStation: b.fromStation,
        fromStationName: b.fromStn.stationName,
        toStation: b.toStation,
        toStationName: b.toStn.stationName,
        boardingStation: b.boardingStation,
        departureTime: fromRoute?.scheduledDeparture ?? "00:00",
        arrivalTime: toRoute?.scheduledArrival ?? "00:00",
        distanceKm: (toRoute?.distanceFromOriginKm ?? 0) - (fromRoute?.distanceFromOriginKm ?? 0),
        coachClass: b.coachClass,
        displayClass: CLASS_DISPLAY_MAP[b.coachClass],
        quota: b.quota,
        totalFare: Number(b.totalFare),
        convenienceFee: Number(b.convenienceFee),
        gstAmount: Number(b.gstAmount),
        bookingStatus: b.bookingStatus,
        paymentMode: b.paymentMode,
        chartPrepared: b.schedule.chartPrepared,
        createdAt: b.createdAt.toISOString(),
        passengers: b.passengers,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PNR lookup failed." },
      { status: 500 }
    );
  }
}
