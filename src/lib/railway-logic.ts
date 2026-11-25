import crypto from "crypto";
import {
  BerthTypeCode,
  CoachClassCode,
  DisplayClassCode,
  PassengerStatusCode,
  QuotaCode,
  TrainTypeCode,
} from "./types";

export const CLASS_DISPLAY_MAP: Record<CoachClassCode, DisplayClassCode> = {
  ONE_A: "1A",
  TWO_A: "2A",
  THREE_A: "3A",
  THREE_E: "3E",
  CC: "CC",
  EC: "EC",
  SL: "SL",
  TWO_S: "2S",
  ENG: "ENG",
  SLR: "SLR",
  PC: "PC",
};

export const DISPLAY_TO_CLASS_MAP: Record<DisplayClassCode, CoachClassCode> = {
  "1A": "ONE_A",
  "2A": "TWO_A",
  "3A": "THREE_A",
  "3E": "THREE_E",
  CC: "CC",
  EC: "EC",
  SL: "SL",
  "2S": "TWO_S",
  ENG: "ENG",
  SLR: "SLR",
  PC: "PC",
};

export const CLASS_FULL_NAME: Record<CoachClassCode, string> = {
  ONE_A: "AC First Class (1A)",
  TWO_A: "AC 2 Tier (2A)",
  THREE_A: "AC 3 Tier (3A)",
  THREE_E: "AC 3 Economy (3E)",
  CC: "AC Chair Car (CC)",
  EC: "Exec. Chair Car (EC)",
  SL: "Sleeper (SL)",
  TWO_S: "Second Sitting (2S)",
  ENG: "Locomotive",
  SLR: "Guard / Divyangjan",
  PC: "Pantry Car",
};

const RATE_PER_KM: Record<CoachClassCode, number> = {
  ONE_A: 4.1,
  TWO_A: 2.35,
  THREE_A: 1.65,
  THREE_E: 1.48,
  EC: 3.1,
  CC: 1.55,
  SL: 0.62,
  TWO_S: 0.35,
  ENG: 0,
  SLR: 0,
  PC: 0,
};

const MIN_FARE: Record<CoachClassCode, number> = {
  ONE_A: 650,
  TWO_A: 420,
  THREE_A: 310,
  THREE_E: 270,
  EC: 520,
  CC: 260,
  SL: 140,
  TWO_S: 65,
  ENG: 0,
  SLR: 0,
  PC: 0,
};

export function isAcClass(coachClass: CoachClassCode): boolean {
  return ["ONE_A", "TWO_A", "THREE_A", "THREE_E", "CC", "EC"].includes(coachClass);
}

export function calculateSegmentFare(params: {
  distanceKm: number;
  coachClass: CoachClassCode;
  quota: QuotaCode;
  trainType: TrainTypeCode;
}): { baseFare: number; gstAmount: number; convenienceFee: number; perPassengerTotal: number } {
  const { distanceKm, coachClass, quota, trainType } = params;
  const rate = RATE_PER_KM[coachClass] ?? 1.0;
  let base = Math.max(MIN_FARE[coachClass] ?? 100, Math.round(distanceKm * rate));

  if (trainType === "RAJDHANI" || trainType === "SHATABDI") {
    base = Math.round(base * 1.15);
  } else if (trainType === "VANDE_BHARAT") {
    base = Math.round(base * 1.25);
  } else if (trainType === "SUPERFAST") {
    base += coachClass === "SL" || coachClass === "TWO_S" ? 30 : 45;
  }

  // Tatkal surcharge (+30%)
  if (quota === "TQ") {
    base = Math.round(base * 1.3);
  }

  const gstAmount = isAcClass(coachClass) ? Math.round(base * 0.05) : 0;
  const convenienceFee = isAcClass(coachClass) ? 35.4 : 17.7;

  return {
    baseFare: base,
    gstAmount,
    convenienceFee,
    perPassengerTotal: base + gstAmount,
  };
}

export function formatAvailabilityLabel(availableSeats: number, racCount: number, wlCount: number): string {
  if (availableSeats > 0) return `AVAILABLE-${availableSeats}`;
  if (racCount > 0 && racCount < 20) return `RAC-${racCount}`;
  return `WL-${Math.max(1, wlCount)}`;
}

export function generatePnr(): string {
  // 10-digit Indian Railways style PNR starting with 4 or 6 or 8
  const prefixes = ["41", "42", "63", "65", "82", "84"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const rest = Math.floor(10000000 + Math.random() * 89999999).toString();
  return `${prefix}${rest}`;
}

export function generateUtsNumber(): string {
  const rand = Math.floor(10000000 + Math.random() * 89999999).toString();
  return `X${rand}U`;
}

export function generateComplaintRef(): string {
  const rand = Math.floor(100000 + Math.random() * 899999).toString();
  return `RM26-${rand}`;
}

export function signUtsQrPayload(payload: {
  utsNumber: string;
  sourceStation: string;
  destStation: string | null;
  category: string;
  validUntil: string;
  farePaid: number;
}): string {
  const secret = process.env.UTS_HMAC_SECRET || "railone-cris-uts-secret-key-2026";
  const raw = JSON.stringify(payload);
  return crypto.createHmac("sha256", secret).update(raw).digest("hex").slice(0, 24).toUpperCase();
}

export function computeCancellationDeduction(params: {
  coachClass: CoachClassCode;
  status: PassengerStatusCode;
  farePerPassenger: number;
  hoursBeforeDeparture?: number;
}): { deduction: number; refund: number; ruleApplied: string } {
  const { coachClass, status, farePerPassenger, hoursBeforeDeparture = 36 } = params;

  if (status === "CAN") {
    return { deduction: 0, refund: 0, ruleApplied: "Already Cancelled" };
  }

  // RAC / WL clerkage fee is flat ₹60 (+GST if AC)
  if (status === "RAC" || status === "WL") {
    const clerkage = isAcClass(coachClass) ? 65 : 60;
    const deduction = Math.min(farePerPassenger, clerkage);
    return {
      deduction,
      refund: Math.max(0, farePerPassenger - deduction),
      ruleApplied: "RAC/WL Clerkage Deduction",
    };
  }

  // Confirmed ticket cancellation rules
  const flatFeeMap: Record<CoachClassCode, number> = {
    ONE_A: 240,
    EC: 240,
    TWO_A: 200,
    THREE_A: 180,
    THREE_E: 180,
    CC: 180,
    SL: 120,
    TWO_S: 60,
    ENG: 0,
    SLR: 0,
    PC: 0,
  };

  let deduction = flatFeeMap[coachClass] ?? 120;
  let ruleApplied = ">48h Confirmed Flat Clerkage";

  if (hoursBeforeDeparture < 12) {
    deduction = Math.max(deduction, Math.round(farePerPassenger * 0.5));
    ruleApplied = "<12h Departure (50% Deduction)";
  } else if (hoursBeforeDeparture < 48) {
    deduction = Math.max(deduction, Math.round(farePerPassenger * 0.25));
    ruleApplied = "12h–48h Departure (25% Deduction)";
  }

  deduction = Math.min(farePerPassenger, deduction);
  return {
    deduction,
    refund: Math.max(0, farePerPassenger - deduction),
    ruleApplied,
  };
}

export function getBerthTypeForNumber(coachClass: CoachClassCode, berthNumber: number): BerthTypeCode {
  if (coachClass === "CC" || coachClass === "EC" || coachClass === "TWO_S") {
    const mod = ((berthNumber - 1) % 5) + 1;
    if (mod === 1 || mod === 5) return "WS";
    if (mod === 2) return "MS";
    return "AS";
  }
  if (coachClass === "ONE_A") {
    return berthNumber % 2 === 1 ? "LB" : "UB";
  }
  if (coachClass === "TWO_A") {
    const mod = ((berthNumber - 1) % 6) + 1;
    if (mod === 1 || mod === 3) return "LB";
    if (mod === 2 || mod === 4) return "UB";
    if (mod === 5) return "SL";
    return "SU";
  }
  // 3A, 3E, SL standard 8-berth bay
  const mod = ((berthNumber - 1) % 8) + 1;
  if (mod === 1 || mod === 4) return "LB";
  if (mod === 2 || mod === 5) return "MB";
  if (mod === 3 || mod === 6) return "UB";
  if (mod === 7) return "SL";
  return "SU";
}

export function getTotalBerthsForClass(coachClass: CoachClassCode): number {
  switch (coachClass) {
    case "ONE_A":
      return 24;
    case "TWO_A":
      return 48;
    case "THREE_A":
      return 64;
    case "THREE_E":
      return 72;
    case "CC":
      return 78;
    case "EC":
      return 52;
    case "SL":
      return 72;
    case "TWO_S":
      return 100;
    default:
      return 0;
  }
}

export function addMinutesToHHMM(hhmm: string | null, addMinutes: number): string | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  const total = (((h * 60 + m + addMinutes) % 1440) + 1440) % 1440;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export function computeDurationMinutes(
  depTime: string,
  depDay: number,
  arrTime: string,
  arrDay: number
): number {
  const [dh, dm] = depTime.split(":").map(Number);
  const [ah, am] = arrTime.split(":").map(Number);
  return (arrDay - depDay) * 1440 + (ah * 60 + am) - (dh * 60 + dm);
}
