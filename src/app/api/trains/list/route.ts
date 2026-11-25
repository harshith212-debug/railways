import { NextRequest, NextResponse } from "next/server";
import { getRailwayDataset } from "@/lib/github-dataset-loader";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const ds = getRailwayDataset();

  if (!q) {
    return NextResponse.json({
      trains: ds.trains.slice(0, 30).map((t) => ({
        trainNumber: t.trainNumber,
        trainName: t.trainName,
        trainType: t.trainType,
        runningDays: t.runningDays,
        hasPantry: t.hasPantry,
        avgSpeedKmph: t.avgSpeedKmph,
      })),
      totalCount: ds.trains.length,
    });
  }

  const matches = [];
  for (const t of ds.trains) {
    if (matches.length >= 30) break;
    if (
      t.trainNumber.toLowerCase().includes(q) ||
      t.trainName.toLowerCase().includes(q)
    ) {
      matches.push({
        trainNumber: t.trainNumber,
        trainName: t.trainName,
        trainType: t.trainType,
        runningDays: t.runningDays,
        hasPantry: t.hasPantry,
        avgSpeedKmph: t.avgSpeedKmph,
      });
    }
  }

  return NextResponse.json({
    trains: matches,
    totalCount: ds.trains.length,
  });
}
