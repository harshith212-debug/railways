import { NextRequest, NextResponse } from "next/server";
import { isPostgresAvailable, prisma } from "@/lib/prisma";
import { memoryStore } from "@/lib/memory-store";
import { addMinutesToHHMM } from "@/lib/railway-logic";
import { getDateStringOffset } from "@/lib/seed-data";

export async function POST(
  _req: NextRequest,
  context: { params: { trainNumber: string } }
) {
  try {
    const trainNumber = context.params.trainNumber.trim();
    if (!(await isPostgresAvailable())) {
      return NextResponse.json({ liveStatus: memoryStore.simulateNextStop(trainNumber) });
    }

    const today = getDateStringOffset(0);
    const schedule = await prisma.trainSchedule.findUnique({
      where: {
        trainNumber_journeyDate: {
          trainNumber,
          journeyDate: new Date(`${today}T00:00:00.000Z`),
        },
      },
      include: {
        liveTracking: true,
        train: {
          include: {
            routes: { include: { station: true }, orderBy: { stopSequence: "asc" } },
          },
        },
      },
    });

    if (!schedule || !schedule.liveTracking) {
      return NextResponse.json({ liveStatus: memoryStore.simulateNextStop(trainNumber) });
    }

    const routes = schedule.train.routes;
    const currentIdx = routes.findIndex(
      (r) => r.stationCode === schedule.liveTracking!.lastCrossedStation
    );
    const nextIdx = currentIdx < routes.length - 1 ? currentIdx + 1 : 0;
    const upcomingIdx = Math.min(nextIdx + 1, routes.length - 1);

    const nextStop = routes[nextIdx];
    const upcomingStop = routes[upcomingIdx];
    const newDelay =
      nextIdx === 0
        ? 0
        : Math.max(0, schedule.liveTracking.delayMinutes + (Math.floor(Math.random() * 9) - 2));

    const updated = await prisma.liveTrainTracking.update({
      where: { scheduleId: schedule.id },
      data: {
        lastCrossedStation: nextStop.stationCode,
        nextStation: upcomingStop.stationCode,
        delayMinutes: newDelay,
        currentLat: (nextStop.station.latitude + upcomingStop.station.latitude) / 2,
        currentLng: (nextStop.station.longitude + upcomingStop.station.longitude) / 2,
      },
      include: { lastStn: true, nextStn: true },
    });

    const stops = routes.map((r, idx) => ({
      stopSequence: r.stopSequence,
      stationCode: r.stationCode,
      stationName: r.station.stationName,
      dayOfJourney: r.dayOfJourney,
      scheduledArrival: r.scheduledArrival,
      scheduledDeparture: r.scheduledDeparture,
      actualArrival: addMinutesToHHMM(r.scheduledArrival, updated.delayMinutes),
      actualDeparture: addMinutesToHHMM(r.scheduledDeparture, updated.delayMinutes),
      haltMinutes: r.haltMinutes,
      distanceFromOriginKm: r.distanceFromOriginKm,
      platform: r.defaultPlatform,
      status: idx < nextIdx ? "CROSSED" : idx === nextIdx ? "CURRENT" : "UPCOMING",
      delayMinutes: updated.delayMinutes,
    }));

    return NextResponse.json({
      liveStatus: {
        scheduleId: schedule.id,
        trainNumber,
        trainName: schedule.train.trainName,
        trainType: schedule.train.trainType,
        journeyDate: today,
        lastCrossedStation: updated.lastCrossedStation,
        lastCrossedStationName: updated.lastStn.stationName,
        nextStation: updated.nextStation,
        nextStationName: updated.nextStn.stationName,
        delayMinutes: updated.delayMinutes,
        currentLat: updated.currentLat,
        currentLng: updated.currentLng,
        updatedAt: updated.updatedAt.toISOString(),
        progressPercent: Math.round((nextIdx / Math.max(1, routes.length - 1)) * 100),
        stops,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Simulation failed." },
      { status: 400 }
    );
  }
}
