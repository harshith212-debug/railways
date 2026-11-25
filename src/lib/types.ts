export type CoachClassCode =
  | "ONE_A"
  | "TWO_A"
  | "THREE_A"
  | "THREE_E"
  | "CC"
  | "EC"
  | "SL"
  | "TWO_S"
  | "ENG"
  | "SLR"
  | "PC";

export type DisplayClassCode = "1A" | "2A" | "3A" | "3E" | "CC" | "EC" | "SL" | "2S" | "ENG" | "SLR" | "PC";

export type BerthTypeCode = "LB" | "MB" | "UB" | "SL" | "SU" | "WS" | "MS" | "AS";
export type QuotaCode = "GN" | "TQ" | "LD" | "SS";
export type GenderCode = "MALE" | "FEMALE" | "TRANSGENDER";
export type PassengerStatusCode = "CNF" | "RAC" | "WL" | "CAN";
export type BookingStatusCode = "CONFIRMED" | "RAC" | "WAITLISTED" | "PARTIALLY_CANCELLED" | "CANCELLED";
export type TrainTypeCode = "VANDE_BHARAT" | "RAJDHANI" | "SHATABDI" | "SUPERFAST" | "EXPRESS" | "MAIL";
export type UtsCategoryCode = "UNRESERVED_JOURNEY" | "PLATFORM_TICKET" | "SEASON_PASS";
export type EcateringStatusCode = "PLACED" | "CONFIRMED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
export type ComplaintCategoryCode =
  | "COACH_CLEANLINESS"
  | "WATER_AVAILABILITY"
  | "ELECTRICAL_AC"
  | "SECURITY"
  | "CATERING_QUALITY"
  | "MEDICAL_EMERGENCY"
  | "STAFF_BEHAVIOUR";
export type ComplaintStatusCode = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface StationDTO {
  stationCode: string;
  stationName: string;
  city: string;
  state: string;
  railwayZone: string;
  numPlatforms: number;
  latitude: number;
  longitude: number;
}

export interface TrainRouteDTO {
  id: string;
  trainNumber: string;
  stationCode: string;
  stationName?: string;
  stopSequence: number;
  dayOfJourney: number;
  scheduledArrival: string | null;
  scheduledDeparture: string | null;
  haltMinutes: number;
  distanceFromOriginKm: number;
  defaultPlatform: number;
}

export interface CoachSeatDTO {
  id: string;
  coachId: string;
  berthNumber: number;
  berthType: BerthTypeCode;
  cabinNumber: number;
  occupied?: boolean;
  passengerName?: string;
  pnr?: string;
}

export interface TrainCoachDTO {
  id: string;
  trainNumber: string;
  coachCode: string;
  coachClass: CoachClassCode;
  rakePosition: number;
  totalBerths: number;
  seats: CoachSeatDTO[];
}

export interface TrainDTO {
  trainNumber: string;
  trainName: string;
  trainType: TrainTypeCode;
  runningDays: string;
  hasPantry: boolean;
  avgSpeedKmph: number;
}

export interface SeatAvailabilityDTO {
  id: string;
  scheduleId: string;
  coachClass: CoachClassCode;
  displayClass: DisplayClassCode;
  quota: QuotaCode;
  availableSeats: number;
  racCount: number;
  wlCount: number;
  baseFare: number;
  totalFareWithTax: number;
  statusLabel: string;
}

export interface TrainSearchResultDTO {
  scheduleId: string;
  trainNumber: string;
  trainName: string;
  trainType: TrainTypeCode;
  runningDays: string;
  hasPantry: boolean;
  journeyDate: string;
  fromStation: string;
  fromStationName: string;
  toStation: string;
  toStationName: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  distanceKm: number;
  dayDiff: number;
  availabilities: SeatAvailabilityDTO[];
}

export interface MasterPassengerDTO {
  id: string;
  userId: string;
  fullName: string;
  age: number;
  gender: GenderCode;
  berthPreference: BerthTypeCode | null;
  idCardType?: string | null;
  idCardNumber?: string | null;
  isSeniorCitizen: boolean;
}

export interface WalletTransactionDTO {
  id: string;
  userId: string;
  txnType: "CREDIT" | "DEBIT" | "REFUND" | "UTS_CASHBACK";
  amount: number;
  cashbackAmt: number;
  balanceAfter: number;
  referenceId: string;
  description: string;
  createdAt: string;
}

export interface UserDTO {
  id: string;
  irctcUsername: string;
  fullName: string;
  email: string;
  phone: string;
  aadhaarVerified: boolean;
  walletBalance: number;
}

export interface BookingPassengerDTO {
  passengerId: string;
  pnr: string;
  name: string;
  age: number;
  gender: GenderCode;
  berthPreference: BerthTypeCode | null;
  bookingStatus: PassengerStatusCode;
  currentStatus: PassengerStatusCode;
  allocatedCoach: string | null;
  allocatedBerth: number | null;
  berthType: BerthTypeCode | null;
  racOrWlNumber: number | null;
}

export interface BookingDTO {
  pnr: string;
  userId: string;
  scheduleId: string;
  trainNumber: string;
  trainName: string;
  trainType: TrainTypeCode;
  journeyDate: string;
  fromStation: string;
  fromStationName: string;
  toStation: string;
  toStationName: string;
  boardingStation: string;
  departureTime: string;
  arrivalTime: string;
  distanceKm: number;
  coachClass: CoachClassCode;
  displayClass: DisplayClassCode;
  quota: QuotaCode;
  totalFare: number;
  convenienceFee: number;
  gstAmount: number;
  bookingStatus: BookingStatusCode;
  paymentMode: string;
  chartPrepared: boolean;
  createdAt: string;
  passengers: BookingPassengerDTO[];
}

export interface UtsTicketDTO {
  utsNumber: string;
  userId: string;
  ticketCategory: UtsCategoryCode;
  sourceStation: string;
  sourceStationName: string;
  destStation: string | null;
  destStationName: string | null;
  adultCount: number;
  childCount: number;
  farePaid: number;
  discountApplied: number;
  qrSignatureHash: string;
  validFrom: string;
  validUntil: string;
  createdAt: string;
}

export interface LiveStatusStopDTO {
  stopSequence: number;
  stationCode: string;
  stationName: string;
  dayOfJourney: number;
  scheduledArrival: string | null;
  scheduledDeparture: string | null;
  actualArrival: string | null;
  actualDeparture: string | null;
  haltMinutes: number;
  distanceFromOriginKm: number;
  platform: number;
  status: "CROSSED" | "CURRENT" | "UPCOMING";
  delayMinutes: number;
}

export interface LiveTrainStatusDTO {
  scheduleId: string;
  trainNumber: string;
  trainName: string;
  trainType: TrainTypeCode;
  journeyDate: string;
  lastCrossedStation: string;
  lastCrossedStationName: string;
  nextStation: string;
  nextStationName: string;
  delayMinutes: number;
  currentLat: number;
  currentLng: number;
  updatedAt: string;
  progressPercent: number;
  stops: LiveStatusStopDTO[];
}

export interface EcateringOrderDTO {
  id: string;
  userId: string;
  pnr: string;
  stationCode: string;
  stationName: string;
  vendorName: string;
  items: { name: string; qty: number; price: number }[];
  totalAmount: number;
  deliveryCoach: string;
  deliveryBerth: number;
  status: EcateringStatusCode;
  createdAt: string;
}

export interface RailMadadComplaintDTO {
  id: string;
  referenceNo: string;
  userId: string;
  pnr: string | null;
  trainNumber: string;
  trainName?: string;
  category: ComplaintCategoryCode;
  description: string;
  coachNumber: string | null;
  status: ComplaintStatusCode;
  resolution: string | null;
  createdAt: string;
}
