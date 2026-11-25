import fs from "fs";
import path from "path";
import { CoachClassCode, StationDTO, TrainTypeCode } from "./types";
import type { SeedTrainDef } from "./seed-data";
import { INDIA_STATIONS, INDIA_TRAINS } from "./india-rail-dataset";

export interface LoadedDataset {
  stations: StationDTO[];
  stationMap: Map<string, StationDTO>;
  trains: SeedTrainDef[];
  trainMap: Map<string, SeedTrainDef>;
  stationToTrains: Map<string, string[]>;
  fromGithubFiles: boolean;
}

const EXP_RAKE: SeedTrainDef["rake"] = [
  { coachCode: "ENG", coachClass: "ENG" },
  { coachCode: "SLR1", coachClass: "SLR" },
  { coachCode: "H1", coachClass: "ONE_A" },
  { coachCode: "A1", coachClass: "TWO_A" },
  { coachCode: "B1", coachClass: "THREE_A" },
  { coachCode: "B2", coachClass: "THREE_A" },
  { coachCode: "PC", coachClass: "PC" },
  { coachCode: "S1", coachClass: "SL" },
  { coachCode: "S2", coachClass: "SL" },
  { coachCode: "S3", coachClass: "SL" },
  { coachCode: "SLR2", coachClass: "SLR" },
];

const CC_RAKE: SeedTrainDef["rake"] = [
  { coachCode: "ENG", coachClass: "ENG" },
  { coachCode: "C1", coachClass: "CC" },
  { coachCode: "C2", coachClass: "CC" },
  { coachCode: "C3", coachClass: "CC" },
  { coachCode: "E1", coachClass: "EC" },
  { coachCode: "SLR2", coachClass: "SLR" },
];

function mapTrainType(rawType: string | undefined, name: string): TrainTypeCode {
  const t = (rawType || "").toUpperCase();
  const n = (name || "").toUpperCase();
  if (n.includes("VANDE BHARAT")) return "VANDE_BHARAT";
  if (t.includes("RAJ") || n.includes("RAJDHANI")) return "RAJDHANI";
  if (t.includes("SHTB") || n.includes("SHATABDI")) return "SHATABDI";
  if (t.includes("SF") || n.includes("SUPERFAST") || n.includes("SF")) return "SUPERFAST";
  if (t.includes("MAIL") || n.includes("MAIL")) return "MAIL";
  return "EXPRESS";
}

function normalizeTime(t: string | null | undefined): string | null {
  if (!t || t === "None" || t === "null") return null;
  // "12:15:00" -> "12:15"
  return String(t).slice(0, 5);
}

const globalForDataset = globalThis as unknown as {
  __railYatraDataset?: LoadedDataset;
};

export function getRailwayDataset(): LoadedDataset {
  if (globalForDataset.__railYatraDataset) {
    return globalForDataset.__railYatraDataset;
  }

  const dataDir = path.join(process.cwd(), "data");
  const stationsPath = path.join(dataDir, "stations.json");
  const trainsPath = path.join(dataDir, "trains.json");
  const schedulesPath = path.join(dataDir, "schedules.json");

  if (!fs.existsSync(stationsPath) || !fs.existsSync(trainsPath) || !fs.existsSync(schedulesPath)) {
    const stationMap = new Map(INDIA_STATIONS.map((s) => [s.stationCode, s]));
    const trainMap = new Map(INDIA_TRAINS.map((t) => [t.trainNumber, t]));
    const stationToTrains = new Map<string, string[]>();
    for (const tr of INDIA_TRAINS) {
      for (const st of tr.stops) {
        const list = stationToTrains.get(st.stationCode) || [];
        list.push(tr.trainNumber);
        stationToTrains.set(st.stationCode, list);
      }
    }
    globalForDataset.__railYatraDataset = {
      stations: INDIA_STATIONS,
      stationMap,
      trains: INDIA_TRAINS,
      trainMap,
      stationToTrains,
      fromGithubFiles: false,
    };
    return globalForDataset.__railYatraDataset;
  }

  // 1. Parse stations.json (GeoJSON FeatureCollection)
  const stationMap = new Map<string, StationDTO>();
  // Pre-seed curated major stations first so they keep exact platform counts & clean names
  for (const s of INDIA_STATIONS) {
    stationMap.set(s.stationCode, s);
  }

  const rawStations = JSON.parse(fs.readFileSync(stationsPath, "utf8"));
  for (const feat of rawStations.features || []) {
    const props = feat.properties || {};
    const code = String(props.code || "").trim().toUpperCase();
    if (!code || code.startsWith("XX-") || code.startsWith("YY-") || code.length > 8) continue;
    if (stationMap.has(code)) continue;

    const coords = feat.geometry?.coordinates || [78.9629, 20.5937];
    const lng = Number(coords[0]) || 78.9629;
    const lat = Number(coords[1]) || 20.5937;
    const addr = String(props.address || "");
    const city = addr ? addr.split(",")[0].trim() : String(props.name || code);

    stationMap.set(code, {
      stationCode: code,
      stationName: String(props.name || code),
      city,
      state: String(props.state || "India"),
      railwayZone: String(props.zone || "IR").slice(0, 10),
      numPlatforms: 3,
      latitude: lat,
      longitude: lng,
    });
  }

  // 2. Group schedules.json by train_number
  const rawSchedules = JSON.parse(fs.readFileSync(schedulesPath, "utf8")) as {
    arrival: string;
    departure: string;
    day: number;
    station_code: string;
    station_name: string;
    train_number: string;
  }[];

  const stopsByTrain = new Map<
    string,
    {
      stationCode: string;
      day: number;
      arrival: string | null;
      departure: string | null;
    }[]
  >();

  for (const row of rawSchedules) {
    const tNo = String(row.train_number || "").trim();
    const sCode = String(row.station_code || "").trim().toUpperCase();
    if (!tNo || !sCode) continue;

    if (!stationMap.has(sCode)) {
      stationMap.set(sCode, {
        stationCode: sCode,
        stationName: String(row.station_name || sCode),
        city: String(row.station_name || sCode),
        state: "India",
        railwayZone: "IR",
        numPlatforms: 2,
        latitude: 20.5937,
        longitude: 78.9629,
      });
    }

    let list = stopsByTrain.get(tNo);
    if (!list) {
      list = [];
      stopsByTrain.set(tNo, list);
    }
    list.push({
      stationCode: sCode,
      day: Number(row.day) || 1,
      arrival: normalizeTime(row.arrival),
      departure: normalizeTime(row.departure),
    });
  }

  // 3. Parse trains.json (GeoJSON FeatureCollection)
  const trainMap = new Map<string, SeedTrainDef>();
  // Keep curated trains with exact distances first
  for (const t of INDIA_TRAINS) {
    trainMap.set(t.trainNumber, t);
  }

  const rawTrains = JSON.parse(fs.readFileSync(trainsPath, "utf8"));
  for (const feat of rawTrains.features || []) {
    const p = feat.properties || {};
    const trainNumber = String(p.number || "").trim();
    if (!trainNumber || trainMap.has(trainNumber)) continue;

    const rawStops = stopsByTrain.get(trainNumber);
    if (!rawStops || rawStops.length < 2) continue;

    const totalDist = Math.max(50, Number(p.distance) || rawStops.length * 45);
    const trainName = String(p.name || `Train ${trainNumber}`);
    const trainType = mapTrainType(p.type, trainName);

    const classes: CoachClassCode[] = [];
    if (p.first_ac) classes.push("ONE_A");
    if (p.second_ac) classes.push("TWO_A");
    if (p.third_ac) classes.push("THREE_A");
    if (p.chair_car) classes.push("CC");
    if (p.sleeper) classes.push("SL");
    if (classes.length === 0) classes.push("SL", "TWO_S");

    const rake = classes.includes("CC") && !classes.includes("SL") ? CC_RAKE : EXP_RAKE;
    const durMins = Math.max(60, (Number(p.duration_h) || 2) * 60 + (Number(p.duration_m) || 0));
    const avgSpeedKmph = Math.max(35, Math.min(110, Math.round((totalDist / durMins) * 60)));

    const stops = rawStops.map((st, idx) => ({
      stationCode: st.stationCode,
      stopSequence: idx + 1,
      dayOfJourney: st.day,
      scheduledArrival: idx === 0 ? null : st.arrival || st.departure,
      scheduledDeparture: idx === rawStops.length - 1 ? null : st.departure || st.arrival,
      haltMinutes: idx === 0 || idx === rawStops.length - 1 ? 0 : 2,
      distanceFromOriginKm: Math.round((idx / Math.max(1, rawStops.length - 1)) * totalDist),
      defaultPlatform: (idx % 4) + 1,
    }));

    trainMap.set(trainNumber, {
      trainNumber,
      trainName,
      trainType,
      runningDays: "1111111",
      hasPantry: trainType === "RAJDHANI" || trainType === "SUPERFAST" || trainType === "VANDE_BHARAT",
      avgSpeedKmph,
      rake,
      classes,
      stops,
    });
  }

  // 4. Build station -> trainNumbers inverted index for O(1) search across 5,208 trains
  const stationToTrains = new Map<string, string[]>();
  const allTrainsList = Array.from(trainMap.values());
  for (const tr of allTrainsList) {
    for (const st of tr.stops) {
      let list = stationToTrains.get(st.stationCode);
      if (!list) {
        list = [];
        stationToTrains.set(st.stationCode, list);
      }
      list.push(tr.trainNumber);
    }
  }

  const stations = Array.from(stationMap.values());
  const trains = Array.from(trainMap.values());

  globalForDataset.__railYatraDataset = {
    stations,
    stationMap,
    trains,
    trainMap,
    stationToTrains,
    fromGithubFiles: true,
  };
  return globalForDataset.__railYatraDataset;
}
