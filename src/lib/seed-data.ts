import {
  CoachClassCode,
  QuotaCode,
  StationDTO,
  TrainTypeCode,
} from "./types";
import {
  calculateSegmentFare,
  getBerthTypeForNumber,
  getTotalBerthsForClass,
  signUtsQrPayload,
} from "./railway-logic";
import { INDIA_STATIONS, INDIA_TRAINS } from "./india-rail-dataset";

export const SEED_USER = {
  id: "usr_railone_demo",
  irctcUsername: "arjun_railone",
  fullName: "Arjun Sharma",
  email: "arjun.sharma@railone.in",
  phone: "+91 98490 12345",
  passwordHash: "$2b$10$railoneDemoHashedPasswordPlaceholder",
  mpinHash: "$2b$10$railoneDemoHashedMpinPlaceholder",
  aadhaarVerified: true,
  walletBalance: 4250.0,
};

export const SEED_MASTER_PASSENGERS = [
  {
    id: "mp_1",
    userId: SEED_USER.id,
    fullName: "Arjun Sharma",
    age: 29,
    gender: "MALE" as const,
    berthPreference: "LB" as const,
    idCardType: "AADHAAR",
    idCardNumber: "XXXX-XXXX-4821",
    isSeniorCitizen: false,
  },
  {
    id: "mp_2",
    userId: SEED_USER.id,
    fullName: "Priya Sharma",
    age: 27,
    gender: "FEMALE" as const,
    berthPreference: "SL" as const,
    idCardType: "PAN",
    idCardNumber: "ABCPSXXXXK",
    isSeniorCitizen: false,
  },
  {
    id: "mp_3",
    userId: SEED_USER.id,
    fullName: "Raghavendra Rao",
    age: 64,
    gender: "MALE" as const,
    berthPreference: "LB" as const,
    idCardType: "AADHAAR",
    idCardNumber: "XXXX-XXXX-9104",
    isSeniorCitizen: true,
  },
];

// 100+ Major Indian Railway Stations across all 18 Railway Zones
export const SEED_STATIONS: StationDTO[] = INDIA_STATIONS;

export interface SeedTrainDef {
  trainNumber: string;
  trainName: string;
  trainType: TrainTypeCode;
  runningDays: string;
  hasPantry: boolean;
  avgSpeedKmph: number;
  rake: { coachCode: string; coachClass: CoachClassCode }[];
  stops: {
    stationCode: string;
    stopSequence: number;
    dayOfJourney: number;
    scheduledArrival: string | null;
    scheduledDeparture: string | null;
    haltMinutes: number;
    distanceFromOriginKm: number;
    defaultPlatform: number;
  }[];
  classes: CoachClassCode[];
}

export const SEED_TRAINS: SeedTrainDef[] = INDIA_TRAINS;

export function getDateStringOffset(daysOffset: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

export function buildSeatListForCoach(coachId: string, coachClass: CoachClassCode) {
  const total = getTotalBerthsForClass(coachClass);
  const seats = [];
  for (let i = 1; i <= total; i++) {
    seats.push({
      id: `${coachId}_seat_${i}`,
      coachId,
      berthNumber: i,
      berthType: getBerthTypeForNumber(coachClass, i),
      cabinNumber: Math.ceil(i / (coachClass === "TWO_A" ? 6 : coachClass === "ONE_A" ? 4 : 8)),
    });
  }
  return seats;
}

export function buildInitialAvailabilityForSchedule(
  scheduleId: string,
  train: SeedTrainDef
) {
  const originDist = train.stops[train.stops.length - 1].distanceFromOriginKm;
  const quotas: QuotaCode[] = ["GN", "TQ", "LD", "SS"];
  const rows: {
    id: string;
    scheduleId: string;
    coachClass: CoachClassCode;
    quota: QuotaCode;
    availableSeats: number;
    racCount: number;
    wlCount: number;
    baseFare: number;
  }[] = [];

  for (const cc of train.classes) {
    for (const quota of quotas) {
      const { baseFare } = calculateSegmentFare({
        distanceKm: originDist,
        coachClass: cc,
        quota,
        trainType: train.trainType,
      });

      // Realistic availability mix
      let availableSeats = 42;
      let racCount = 0;
      let wlCount = 0;
      if (quota === "TQ") availableSeats = 14;
      if (quota === "LD" || quota === "SS") availableSeats = 8;
      if (train.trainNumber === "12621" && cc === "THREE_A" && quota === "GN") {
        availableSeats = 0;
        racCount = 4;
      }

      rows.push({
        id: `${scheduleId}_${cc}_${quota}`,
        scheduleId,
        coachClass: cc,
        quota,
        availableSeats,
        racCount,
        wlCount,
        baseFare,
      });
    }
  }
  return rows;
}

export function buildSampleUtsTicket() {
  const now = new Date();
  const validUntil = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const utsNumber = "X88412093U";
  const farePaid = 19.4; // ₹20 - 3% R-Wallet discount
  const qrSignatureHash = signUtsQrPayload({
    utsNumber,
    sourceStation: "SC",
    destStation: null,
    category: "PLATFORM_TICKET",
    validUntil: validUntil.toISOString(),
    farePaid,
  });

  return {
    utsNumber,
    userId: SEED_USER.id,
    ticketCategory: "PLATFORM_TICKET" as const,
    sourceStation: "SC",
    destStation: null,
    adultCount: 2,
    childCount: 0,
    farePaid,
    discountApplied: 0.6,
    qrSignatureHash,
    validFrom: now.toISOString(),
    validUntil: validUntil.toISOString(),
    createdAt: now.toISOString(),
  };
}
