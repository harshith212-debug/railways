import { NextRequest, NextResponse } from "next/server";
import { isPostgresAvailable, prisma } from "@/lib/prisma";
import { memoryStore } from "@/lib/memory-store";
import {
  CLASS_DISPLAY_MAP,
  calculateSegmentFare,
  computeDurationMinutes,
  formatAvailabilityLabel,
} from "@/lib/railway-logic";
import { getDateStringOffset } from "@/lib/seed-data";
import { QuotaCode } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = (searchParams.get("from") || "SC").toUpperCase();
    const to = (searchParams.get("to") || "NDLS").toUpperCase();
    const date = searchParams.get("date") || getDateStringOffset(0);
    const quota = ((searchParams.get("quota") || "GN").toUpperCase() as QuotaCode);

    if (from === to) {
      return NextResponse.json(
        { error: "Origin and destination stations cannot be identical." },
        { status: 400 }
      );
    }

    if (!(await isPostgresAvailable())) {
      const trains = memoryStore.searchTrains({ from, to, date, quota });
      return NextResponse.json({ trains, mode: "FALLBACK_IN_MEMORY" });
    }

    const journeyDate = new Date(`${date}T00:00:00.000Z`);
    const candidateTrains = await prisma.train.findMany({
      where: {
        AND: [
          { routes: { some: { stationCode: from } } },
          { routes: { some: { stationCode: to } } },
        ],
      },
      include: {
        routes: {
          include: { station: true },
          orderBy: { stopSequence: "asc" },
        },
        schedules: {
          where: { journeyDate },
          include: {
            seatAvailability: {
              where: { quota },
            },
          },
        },
      },
    });

    const results = [];
    for (const tr of candidateTrains) {
      const fromStop = tr.routes.find((r) => r.stationCode === from);
      const toStop = tr.routes.find((r) => r.stationCode === to);
      if (!fromStop || !toStop || fromStop.stopSequence >= toStop.stopSequence) {
        continue;
      }

      const schedule = tr.schedules[0];
      if (!schedule) continue;

      const distanceKm = toStop.distanceFromOriginKm - fromStop.distanceFromOriginKm;
      const depTime = fromStop.scheduledDeparture ?? fromStop.scheduledArrival ?? "00:00";
      const arrTime = toStop.scheduledArrival ?? toStop.scheduledDeparture ?? "00:00";

      results.push({
        scheduleId: schedule.id,
        trainNumber: tr.trainNumber,
        trainName: tr.trainName,
        trainType: tr.trainType,
        runningDays: tr.runningDays,
        hasPantry: tr.hasPantry,
        journeyDate: date,
        fromStation: from,
        fromStationName: fromStop.station.stationName,
        toStation: to,
        toStationName: toStop.station.stationName,
        departureTime: depTime,
        arrivalTime: arrTime,
        durationMinutes: computeDurationMinutes(
          depTime,
          fromStop.dayOfJourney,
          arrTime,
          toStop.dayOfJourney
        ),
        distanceKm,
        dayDiff: toStop.dayOfJourney - fromStop.dayOfJourney,
        availabilities: schedule.seatAvailability.map((av) => {
          const fare = calculateSegmentFare({
            distanceKm,
            coachClass: av.coachClass,
            quota,
            trainType: tr.trainType,
          });
          return {
            id: av.id,
            scheduleId: schedule.id,
            coachClass: av.coachClass,
            displayClass: CLASS_DISPLAY_MAP[av.coachClass],
            quota,
            availableSeats: av.availableSeats,
            racCount: av.racCount,
            wlCount: av.wlCount,
            baseFare: fare.baseFare,
            totalFareWithTax: fare.perPassengerTotal,
            statusLabel: formatAvailabilityLabel(av.availableSeats, av.racCount, av.wlCount),
          };
        }),
      });
    }

    return NextResponse.json({ trains: results, mode: "POSTGRESQL" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Train search failed." },
      { status: 500 }
    );
  }
}
