import { NextRequest, NextResponse } from "next/server";
import { getRailwayDataset } from "@/lib/github-dataset-loader";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const ds = getRailwayDataset();

  if (!q) {
    return NextResponse.json({
      stations: ds.stations.slice(0, 30),
      totalCount: ds.stations.length,
    });
  }

  const exactCode = ds.stationMap.get(q.toUpperCase());
  const matches = [];
  if (exactCode) matches.push(exactCode);

  for (const st of ds.stations) {
    if (matches.length >= 30) break;
    if (exactCode && st.stationCode === exactCode.stationCode) continue;
    if (
      st.stationCode.toLowerCase().includes(q) ||
      st.stationName.toLowerCase().includes(q) ||
      st.city.toLowerCase().includes(q) ||
      st.state.toLowerCase().includes(q)
    ) {
      matches.push(st);
    }
  }

  return NextResponse.json({
    stations: matches,
    totalCount: ds.stations.length,
  });
}
