import { NextRequest, NextResponse } from "next/server";
import { isPostgresAvailable, prisma } from "@/lib/prisma";
import { memoryStore } from "@/lib/memory-store";
import { addMinutesToHHMM } from "@/lib/railway-logic";
import { getDateStringOffset } from "@/lib/seed-data";

export async function GET(
  _req: NextRequest,
  context: { params: { trainNumber: string } }
) {
  try {
    const trainNumber = context.params.trainNumber.trim();
    if (!(await isPostgresAvailable())) {
      return NextResponse.json({ liveStatus: memoryStore.getLiveStatus(trainNumber) });
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
        liveTracking: { include: { lastStn: true, nextStn: true } },
        train: {
          include: {
            routes: {
              include: { station: true },
              orderBy: { stopSequence: "asc" },
            },
          },
        },
      },
    });

    if (!schedule || !schedule.liveTracking) {
      return NextResponse.json({ liveStatus: memoryStore.getLiveStatus(trainNumber) });
    }

    const lt = schedule.liveTracking;
    const routes = schedule.train.routes;
    const lastIdx = Math.max(
      0,
      routes.findIndex((r) => r.stationCode === lt.lastCrossedStation)
    );

    const stops = routes.map((r, idx) => ({
      stopSequence: r.stopSequence,
      stationCode: r.stationCode,
      stationName: r.station.stationName,
      dayOfJourney: r.dayOfJourney,
      scheduledArrival: r.scheduledArrival,
      scheduledDeparture: r.scheduledDeparture,
      actualArrival: addMinutesToHHMM(r.scheduledArrival, lt.delayMinutes),
      actualDeparture: addMinutesToHHMM(r.scheduledDeparture, lt.delayMinutes),
      haltMinutes: r.haltMinutes,
      distanceFromOriginKm: r.distanceFromOriginKm,
      platform: r.defaultPlatform,
      status: idx < lastIdx ? "CROSSED" : idx === lastIdx ? "CURRENT" : "UPCOMING",
      delayMinutes: lt.delayMinutes,
    }));

    return NextResponse.json({
      liveStatus: {
        scheduleId: schedule.id,
        trainNumber,
        trainName: schedule.train.trainName,
        trainType: schedule.train.trainType,
        journeyDate: today,
        lastCrossedStation: lt.lastCrossedStation,
        lastCrossedStationName: lt.lastStn.stationName,
        nextStation: lt.nextStation,
        nextStationName: lt.nextStn.stationName,
        delayMinutes: lt.delayMinutes,
        currentLat: lt.currentLat,
        currentLng: lt.currentLng,
        updatedAt: lt.updatedAt.toISOString(),
        progressPercent: Math.round((lastIdx / Math.max(1, routes.length - 1)) * 100),
        stops,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load live status." },
      { status: 400 }
    );
  }
}
