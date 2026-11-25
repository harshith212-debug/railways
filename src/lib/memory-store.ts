import {
  BookingDTO,
  BookingPassengerDTO,
  CoachClassCode,
  ComplaintCategoryCode,
  EcateringOrderDTO,
  GenderCode,
  LiveStatusStopDTO,
  LiveTrainStatusDTO,
  MasterPassengerDTO,
  QuotaCode,
  RailMadadComplaintDTO,
  SeatAvailabilityDTO,
  StationDTO,
  TrainCoachDTO,
  TrainSearchResultDTO,
  UserDTO,
  UtsCategoryCode,
  UtsTicketDTO,
  WalletTransactionDTO,
  BerthTypeCode,
} from "./types";
import {
  SEED_MASTER_PASSENGERS,
  SEED_STATIONS,
  SEED_TRAINS,
  SEED_USER,
  buildInitialAvailabilityForSchedule,
  buildSampleUtsTicket,
  buildSeatListForCoach,
  getDateStringOffset,
} from "./seed-data";
import { getRailwayDataset } from "./github-dataset-loader";
import {
  CLASS_DISPLAY_MAP,
  addMinutesToHHMM,
  calculateSegmentFare,
  computeCancellationDeduction,
  computeDurationMinutes,
  formatAvailabilityLabel,
  generateComplaintRef,
  generatePnr,
  generateUtsNumber,
  signUtsQrPayload,
} from "./railway-logic";

interface InternalSchedule {
  id: string;
  trainNumber: string;
  journeyDate: string;
  chartPrepared: boolean;
  status: "ON_TIME" | "DELAYED" | "RESCHEDULED" | "CANCELLED" | "COMPLETED";
}

interface InternalAvailability {
  id: string;
  scheduleId: string;
  coachClass: CoachClassCode;
  quota: QuotaCode;
  availableSeats: number;
  racCount: number;
  wlCount: number;
  baseFare: number;
}

interface InternalLiveTracking {
  scheduleId: string;
  lastCrossedIndex: number; // index into train.stops
  delayMinutes: number;
  updatedAt: string;
}

export interface MemoryStoreState {
  user: UserDTO;
  users: (UserDTO & { password?: string })[];
  masterPassengers: MasterPassengerDTO[];
  walletTransactions: WalletTransactionDTO[];
  stations: StationDTO[];
  schedules: InternalSchedule[];
  availabilities: InternalAvailability[];
  bookings: BookingDTO[];
  utsTickets: UtsTicketDTO[];
  liveTrackings: InternalLiveTracking[];
  ecateringOrders: EcateringOrderDTO[];
  complaints: RailMadadComplaintDTO[];
}

function createInitialState(): MemoryStoreState {
  const today = getDateStringOffset(0);
  const schedules: InternalSchedule[] = [];
  const availabilities: InternalAvailability[] = [];
  const liveTrackings: InternalLiveTracking[] = [];

  for (const tr of SEED_TRAINS) {
    for (let day = 0; day <= 7; day++) {
      const dateStr = getDateStringOffset(day);
      const scheduleId = `sch_${tr.trainNumber}_${dateStr}`;
      schedules.push({
        id: scheduleId,
        trainNumber: tr.trainNumber,
        journeyDate: dateStr,
        chartPrepared: false,
        status: tr.trainNumber === "12621" && day === 0 ? "DELAYED" : "ON_TIME",
      });
      availabilities.push(...buildInitialAvailabilityForSchedule(scheduleId, tr));
      if (day === 0) {
        liveTrackings.push({
          scheduleId,
          lastCrossedIndex: 0,
          delayMinutes: tr.trainNumber === "12621" ? 18 : 0,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  const stationMap = new Map(SEED_STATIONS.map((s) => [s.stationCode, s]));

  const sampleBooking1: BookingDTO = {
    pnr: "4218905632",
    userId: SEED_USER.id,
    scheduleId: `sch_12723_${today}`,
    trainNumber: "12723",
    trainName: "Telangana Express",
    trainType: "SUPERFAST",
    journeyDate: today,
    fromStation: "SC",
    fromStationName: stationMap.get("SC")!.stationName,
    toStation: "NDLS",
    toStationName: stationMap.get("NDLS")!.stationName,
    boardingStation: "SC",
    departureTime: "06:25",
    arrivalTime: "07:40",
    distanceKm: 1677,
    coachClass: "THREE_A",
    displayClass: "3A",
    quota: "GN",
    totalFare: 5835.4,
    convenienceFee: 35.4,
    gstAmount: 276.0,
    bookingStatus: "CONFIRMED",
    paymentMode: "R_WALLET",
    chartPrepared: false,
    createdAt: new Date().toISOString(),
    passengers: [
      {
        passengerId: "pax_seed_1",
        pnr: "4218905632",
        name: "Arjun Sharma",
        age: 29,
        gender: "MALE",
        berthPreference: "LB",
        bookingStatus: "CNF",
        currentStatus: "CNF",
        allocatedCoach: "B1",
        allocatedBerth: 17,
        berthType: "LB",
        racOrWlNumber: null,
      },
      {
        passengerId: "pax_seed_2",
        pnr: "4218905632",
        name: "Priya Sharma",
        age: 27,
        gender: "FEMALE",
        berthPreference: "SL",
        bookingStatus: "CNF",
        currentStatus: "CNF",
        allocatedCoach: "B1",
        allocatedBerth: 23,
        berthType: "SL",
        racOrWlNumber: null,
      },
    ],
  };

  const sampleBooking2: BookingDTO = {
    pnr: "6540129847",
    userId: SEED_USER.id,
    scheduleId: `sch_12621_${today}`,
    trainNumber: "12621",
    trainName: "Tamil Nadu Express",
    trainType: "SUPERFAST",
    journeyDate: today,
    fromStation: "MAS",
    fromStationName: stationMap.get("MAS")!.stationName,
    toStation: "NDLS",
    toStationName: stationMap.get("NDLS")!.stationName,
    boardingStation: "MAS",
    departureTime: "22:00",
    arrivalTime: "06:30",
    distanceKm: 2182,
    coachClass: "THREE_A",
    displayClass: "3A",
    quota: "GN",
    totalFare: 3825.4,
    convenienceFee: 35.4,
    gstAmount: 180.0,
    bookingStatus: "RAC",
    paymentMode: "R_WALLET",
    chartPrepared: false,
    createdAt: new Date().toISOString(),
    passengers: [
      {
        passengerId: "pax_seed_3",
        pnr: "6540129847",
        name: "Raghavendra Rao",
        age: 64,
        gender: "MALE",
        berthPreference: "LB",
        bookingStatus: "RAC",
        currentStatus: "RAC",
        allocatedCoach: "B2",
        allocatedBerth: 7,
        berthType: "SL",
        racOrWlNumber: 3,
      },
    ],
  };

  const rawUts = buildSampleUtsTicket();
  const sampleUts: UtsTicketDTO = {
    ...rawUts,
    sourceStationName: stationMap.get(rawUts.sourceStation)!.stationName,
    destStationName: null,
  };

  const demoUser: UserDTO & { password?: string } = {
    id: SEED_USER.id,
    irctcUsername: SEED_USER.irctcUsername,
    fullName: SEED_USER.fullName,
    email: SEED_USER.email,
    phone: SEED_USER.phone,
    aadhaarVerified: SEED_USER.aadhaarVerified,
    walletBalance: SEED_USER.walletBalance,
    password: "password123",
  };

  return {
    user: {
      id: demoUser.id,
      irctcUsername: demoUser.irctcUsername,
      fullName: demoUser.fullName,
      email: demoUser.email,
      phone: demoUser.phone,
      aadhaarVerified: demoUser.aadhaarVerified,
      walletBalance: demoUser.walletBalance,
    },
    users: [demoUser],
    masterPassengers: [...SEED_MASTER_PASSENGERS],
    walletTransactions: [
      {
        id: "wtxn_seed_init",
        userId: SEED_USER.id,
        txnType: "CREDIT",
        amount: 4250.0,
        cashbackAmt: 0,
        balanceAfter: 4250.0,
        referenceId: "UPI-INIT-90421",
        description: "Initial R-Wallet Top-up via BHIM UPI",
        createdAt: new Date().toISOString(),
      },
    ],
    stations: [...SEED_STATIONS],
    schedules,
    availabilities,
    bookings: [sampleBooking1, sampleBooking2],
    utsTickets: [sampleUts],
    liveTrackings,
    ecateringOrders: [],
    complaints: [],
  };
}

const globalForStore = globalThis as unknown as {
  __railoneMemoryStore?: MemoryStoreState;
};

function getStore(): MemoryStoreState {
  if (!globalForStore.__railoneMemoryStore) {
    globalForStore.__railoneMemoryStore = createInitialState();
  }
  return globalForStore.__railoneMemoryStore;
}

export const memoryStore = {
  registerUser(payload: {
    fullName: string;
    irctcUsername: string;
    email: string;
    phone: string;
    password: string;
  }) {
    const s = getStore();
    const exists = s.users.find(
      (u) =>
        u.irctcUsername.toLowerCase() === payload.irctcUsername.toLowerCase() ||
        u.email.toLowerCase() === payload.email.toLowerCase()
    );
    if (exists) {
      throw new Error("IRCTC Username or Email is already registered.");
    }
    const newUser: UserDTO & { password?: string } = {
      id: `usr_${Date.now()}`,
      irctcUsername: payload.irctcUsername.trim(),
      fullName: payload.fullName.trim(),
      email: payload.email.trim(),
      phone: payload.phone.trim(),
      aadhaarVerified: true,
      walletBalance: 1000.0, // Welcome R-Wallet bonus
      password: payload.password,
    };
    s.users.push(newUser);
    s.user = {
      id: newUser.id,
      irctcUsername: newUser.irctcUsername,
      fullName: newUser.fullName,
      email: newUser.email,
      phone: newUser.phone,
      aadhaarVerified: newUser.aadhaarVerified,
      walletBalance: newUser.walletBalance,
    };
    s.walletTransactions.unshift({
      id: `wtxn_${Date.now()}`,
      userId: newUser.id,
      txnType: "CREDIT",
      amount: 1000.0,
      cashbackAmt: 0,
      balanceAfter: 1000.0,
      referenceId: "RY-WELCOME-1000",
      description: "Rail Yatra Welcome R-Wallet Bonus",
      createdAt: new Date().toISOString(),
    });
    return s.user;
  },

  loginUser(identifier: string, password: string) {
    const s = getStore();
    const found = s.users.find(
      (u) =>
        u.irctcUsername.toLowerCase() === identifier.trim().toLowerCase() ||
        u.email.toLowerCase() === identifier.trim().toLowerCase()
    );
    if (!found || (found.password && found.password !== password)) {
      throw new Error("Invalid IRCTC Username/Email or Password.");
    }
    s.user = {
      id: found.id,
      irctcUsername: found.irctcUsername,
      fullName: found.fullName,
      email: found.email,
      phone: found.phone,
      aadhaarVerified: found.aadhaarVerified,
      walletBalance: found.walletBalance,
    };
    return s.user;
  },

  getBootstrapData() {
    const s = getStore();
    const ds = getRailwayDataset();
    return {
      mode: "FALLBACK_IN_MEMORY" as const,
      fromGithubDataset: ds.fromGithubFiles,
      totalStationsCount: ds.stations.length,
      totalTrainsCount: ds.trains.length,
      user: s.user,
      masterPassengers: s.masterPassengers,
      walletTransactions: s.walletTransactions,
      stations: s.stations,
      trains: SEED_TRAINS.map((t) => ({
        trainNumber: t.trainNumber,
        trainName: t.trainName,
        trainType: t.trainType,
        runningDays: t.runningDays,
        hasPantry: t.hasPantry,
        avgSpeedKmph: t.avgSpeedKmph,
      })),
      bookings: s.bookings,
      utsTickets: s.utsTickets,
      ecateringOrders: s.ecateringOrders,
      complaints: s.complaints,
    };
  },

  topUpWallet(amount: number, method: string) {
    const s = getStore();
    if (amount <= 0 || amount > 50000) {
      throw new Error("Top-up amount must be between ₹1 and ₹50,000");
    }
    s.user.walletBalance = Number((s.user.walletBalance + amount).toFixed(2));
    const txn: WalletTransactionDTO = {
      id: `wtxn_${Date.now()}`,
      userId: s.user.id,
      txnType: "CREDIT",
      amount,
      cashbackAmt: 0,
      balanceAfter: s.user.walletBalance,
      referenceId: `${method.toUpperCase()}-${Math.floor(100000 + Math.random() * 899999)}`,
      description: `R-Wallet Recharge via ${method}`,
      createdAt: new Date().toISOString(),
    };
    s.walletTransactions.unshift(txn);
    return { user: s.user, transaction: txn };
  },

  searchTrains(params: { from: string; to: string; date: string; quota: QuotaCode }): TrainSearchResultDTO[] {
    const s = getStore();
    const ds = getRailwayDataset();
    const { from, to, date, quota } = params;
    const results: TrainSearchResultDTO[] = [];

    const fromTrains = ds.stationToTrains.get(from) || [];
    const toTrainSet = new Set(ds.stationToTrains.get(to) || []);
    const candidateTrainNumbers = fromTrains.filter((tn) => toTrainSet.has(tn));

    for (const tn of candidateTrainNumbers) {
      const train = ds.trainMap.get(tn);
      if (!train) continue;

      const fromStop = train.stops.find((st) => st.stationCode === from);
      const toStop = train.stops.find((st) => st.stationCode === to);
      if (!fromStop || !toStop || fromStop.stopSequence >= toStop.stopSequence) {
        continue;
      }

      let schedule = s.schedules.find(
        (sch) => sch.trainNumber === train.trainNumber && sch.journeyDate === date
      );
      if (!schedule) {
        schedule = {
          id: `sch_${train.trainNumber}_${date}`,
          trainNumber: train.trainNumber,
          journeyDate: date,
          chartPrepared: false,
          status: "ON_TIME",
        };
        s.schedules.push(schedule);
        s.availabilities.push(...buildInitialAvailabilityForSchedule(schedule.id, train));
      }

      const distanceKm = Math.max(20, toStop.distanceFromOriginKm - fromStop.distanceFromOriginKm);
      const depTime = fromStop.scheduledDeparture || fromStop.scheduledArrival || "00:00";
      const arrTime = toStop.scheduledArrival || toStop.scheduledDeparture || "00:00";
      const durationMinutes = Math.max(
        30,
        computeDurationMinutes(depTime, fromStop.dayOfJourney, arrTime, toStop.dayOfJourney)
      );

      const schAvails = s.availabilities.filter(
        (av) => av.scheduleId === schedule!.id && av.quota === quota
      );

      const availabilities: SeatAvailabilityDTO[] = schAvails.map((av) => {
        const fare = calculateSegmentFare({
          distanceKm,
          coachClass: av.coachClass,
          quota,
          trainType: train.trainType,
        });
        return {
          id: av.id,
          scheduleId: schedule!.id,
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
      });

      results.push({
        scheduleId: schedule.id,
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        trainType: train.trainType,
        runningDays: train.runningDays,
        hasPantry: train.hasPantry,
        journeyDate: date,
        fromStation: from,
        fromStationName: ds.stationMap.get(from)?.stationName ?? from,
        toStation: to,
        toStationName: ds.stationMap.get(to)?.stationName ?? to,
        departureTime: depTime,
        arrivalTime: arrTime,
        durationMinutes,
        distanceKm,
        dayDiff: Math.max(0, toStop.dayOfJourney - fromStop.dayOfJourney),
        availabilities,
      });

      if (results.length >= 40) break;
    }

    return results;
  },

  createBooking(payload: {
    scheduleId: string;
    fromStation: string;
    toStation: string;
    boardingStation?: string;
    coachClass: CoachClassCode;
    quota: QuotaCode;
    paymentMode: string;
    passengers: {
      name: string;
      age: number;
      gender: GenderCode;
      berthPreference?: BerthTypeCode | null;
    }[];
  }): BookingDTO {
    const s = getStore();
    if (!payload.passengers.length || payload.passengers.length > 6) {
      throw new Error("Between 1 and 6 passengers are allowed per booking.");
    }

    const schedule = s.schedules.find((sch) => sch.id === payload.scheduleId);
    if (!schedule) throw new Error("Train schedule not found.");

    const ds = getRailwayDataset();
    const train = ds.trainMap.get(schedule.trainNumber);
    if (!train) throw new Error("Train not found.");

    const fromStop = train.stops.find((st) => st.stationCode === payload.fromStation);
    const toStop = train.stops.find((st) => st.stationCode === payload.toStation);
    if (!fromStop || !toStop || fromStop.stopSequence >= toStop.stopSequence) {
      throw new Error("Invalid origin/destination station pair for this train.");
    }

    const avail = s.availabilities.find(
      (av) =>
        av.scheduleId === schedule.id &&
        av.coachClass === payload.coachClass &&
        av.quota === payload.quota
    );
    if (!avail) throw new Error("Selected class/quota is not available on this train.");

    const distanceKm = toStop.distanceFromOriginKm - fromStop.distanceFromOriginKm;
    const fareCalc = calculateSegmentFare({
      distanceKm,
      coachClass: payload.coachClass,
      quota: payload.quota,
      trainType: train.trainType,
    });

    const count = payload.passengers.length;
    const totalGst = fareCalc.gstAmount * count;
    const totalFare = Number((fareCalc.baseFare * count + totalGst + fareCalc.convenienceFee).toFixed(2));

    if (payload.paymentMode === "R_WALLET") {
      if (s.user.walletBalance < totalFare) {
        throw new Error(
          `Insufficient R-Wallet balance. Required ₹${totalFare.toFixed(2)}, Available ₹${s.user.walletBalance.toFixed(2)}.`
        );
      }
      s.user.walletBalance = Number((s.user.walletBalance - totalFare).toFixed(2));
    }

    const pnr = generatePnr();

    // Find coaches of requested class and already-occupied berths on this schedule
    const matchingCoaches = train.rake
      .filter((c) => c.coachClass === payload.coachClass)
      .map((c) => ({
        ...c,
        seats: buildSeatListForCoach(`coach_${train.trainNumber}_${c.coachCode}`, c.coachClass),
      }));

    const occupiedKeys = new Set<string>();
    for (const b of s.bookings) {
      if (b.scheduleId === schedule.id && b.bookingStatus !== "CANCELLED") {
        for (const p of b.passengers) {
          if (p.currentStatus !== "CAN" && p.allocatedCoach && p.allocatedBerth) {
            occupiedKeys.add(`${p.allocatedCoach}_${p.allocatedBerth}`);
          }
        }
      }
    }

    // Collect free seats in coach order so passengers get consecutive berths in same coach
    const freeSeats: { coachCode: string; berthNumber: number; berthType: BerthTypeCode }[] = [];
    for (const coach of matchingCoaches) {
      for (const seat of coach.seats) {
        if (!occupiedKeys.has(`${coach.coachCode}_${seat.berthNumber}`)) {
          freeSeats.push({
            coachCode: coach.coachCode,
            berthNumber: seat.berthNumber,
            berthType: seat.berthType,
          });
        }
      }
    }

    const allocatedPassengers: BookingPassengerDTO[] = [];
    let hasRac = false;
    let hasWl = false;

    for (const pax of payload.passengers) {
      if (avail.availableSeats > 0 && freeSeats.length > 0) {
        avail.availableSeats -= 1;
        // Prefer matching berth preference in the first available coach
        let chosenIdx = -1;
        if (pax.berthPreference) {
          chosenIdx = freeSeats.findIndex((fs) => fs.berthType === pax.berthPreference);
        }
        if (chosenIdx === -1) chosenIdx = 0;
        const chosen = freeSeats.splice(chosenIdx, 1)[0];

        allocatedPassengers.push({
          passengerId: `pax_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          pnr,
          name: pax.name,
          age: pax.age,
          gender: pax.gender,
          berthPreference: pax.berthPreference ?? null,
          bookingStatus: "CNF",
          currentStatus: "CNF",
          allocatedCoach: chosen.coachCode,
          allocatedBerth: chosen.berthNumber,
          berthType: chosen.berthType,
          racOrWlNumber: null,
        });
      } else if (avail.racCount < 12) {
        avail.racCount += 1;
        hasRac = true;
        const racCoach = matchingCoaches[0]?.coachCode ?? "B1";
        allocatedPassengers.push({
          passengerId: `pax_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          pnr,
          name: pax.name,
          age: pax.age,
          gender: pax.gender,
          berthPreference: pax.berthPreference ?? null,
          bookingStatus: "RAC",
          currentStatus: "RAC",
          allocatedCoach: racCoach,
          allocatedBerth: 7,
          berthType: "SL",
          racOrWlNumber: avail.racCount,
        });
      } else {
        avail.wlCount += 1;
        hasWl = true;
        allocatedPassengers.push({
          passengerId: `pax_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          pnr,
          name: pax.name,
          age: pax.age,
          gender: pax.gender,
          berthPreference: pax.berthPreference ?? null,
          bookingStatus: "WL",
          currentStatus: "WL",
          allocatedCoach: null,
          allocatedBerth: null,
          berthType: null,
          racOrWlNumber: avail.wlCount,
        });
      }
    }

    if (payload.paymentMode === "R_WALLET") {
      s.walletTransactions.unshift({
        id: `wtxn_${Date.now()}`,
        userId: s.user.id,
        txnType: "DEBIT",
        amount: totalFare,
        cashbackAmt: 0,
        balanceAfter: s.user.walletBalance,
        referenceId: pnr,
        description: `IRCTC Ticket Booking (${train.trainNumber} ${payload.fromStation}-${payload.toStation})`,
        createdAt: new Date().toISOString(),
      });
    }

    const stationMap = ds.stationMap;
    const booking: BookingDTO = {
      pnr,
      userId: s.user.id,
      scheduleId: schedule.id,
      trainNumber: train.trainNumber,
      trainName: train.trainName,
      trainType: train.trainType,
      journeyDate: schedule.journeyDate,
      fromStation: payload.fromStation,
      fromStationName: stationMap.get(payload.fromStation)?.stationName ?? payload.fromStation,
      toStation: payload.toStation,
      toStationName: stationMap.get(payload.toStation)?.stationName ?? payload.toStation,
      boardingStation: payload.boardingStation || payload.fromStation,
      departureTime: fromStop.scheduledDeparture || fromStop.scheduledArrival || "00:00",
      arrivalTime: toStop.scheduledArrival || toStop.scheduledDeparture || "00:00",
      distanceKm,
      coachClass: payload.coachClass,
      displayClass: CLASS_DISPLAY_MAP[payload.coachClass],
      quota: payload.quota,
      totalFare,
      convenienceFee: fareCalc.convenienceFee,
      gstAmount: totalGst,
      bookingStatus: hasWl ? "WAITLISTED" : hasRac ? "RAC" : "CONFIRMED",
      paymentMode: payload.paymentMode,
      chartPrepared: schedule.chartPrepared,
      createdAt: new Date().toISOString(),
      passengers: allocatedPassengers,
    };

    s.bookings.unshift(booking);
    return booking;
  },

  cancelBooking(pnr: string, passengerIds?: string[]) {
    const s = getStore();
    const booking = s.bookings.find((b) => b.pnr === pnr);
    if (!booking) throw new Error("PNR not found.");
    if (booking.bookingStatus === "CANCELLED") {
      throw new Error("Ticket is already cancelled.");
    }

    const targets = passengerIds?.length
      ? booking.passengers.filter((p) => passengerIds.includes(p.passengerId) && p.currentStatus !== "CAN")
      : booking.passengers.filter((p) => p.currentStatus !== "CAN");

    if (!targets.length) {
      throw new Error("No active passengers selected for cancellation.");
    }

    const farePerPassenger =
      (booking.totalFare - booking.convenienceFee) / Math.max(1, booking.passengers.length);

    let totalRefund = 0;
    let totalDeduction = 0;
    const avail = s.availabilities.find(
      (av) =>
        av.scheduleId === booking.scheduleId &&
        av.coachClass === booking.coachClass &&
        av.quota === booking.quota
    );

    const freedBerths: { coach: string; berth: number; berthType: BerthTypeCode | null }[] = [];

    for (const pax of targets) {
      const calc = computeCancellationDeduction({
        coachClass: booking.coachClass,
        status: pax.currentStatus,
        farePerPassenger,
      });
      totalRefund += calc.refund;
      totalDeduction += calc.deduction;

      if (pax.currentStatus === "CNF" && pax.allocatedCoach && pax.allocatedBerth) {
        freedBerths.push({
          coach: pax.allocatedCoach,
          berth: pax.allocatedBerth,
          berthType: pax.berthType,
        });
      }
      pax.currentStatus = "CAN";
    }

    // Promote top RAC/WL passengers on the same schedule + class
    const promotedPnrs: string[] = [];
    for (const freed of freedBerths) {
      let promoted = false;
      for (const other of s.bookings) {
        if (other.scheduleId === booking.scheduleId && other.coachClass === booking.coachClass) {
          const racPax = other.passengers.find((p) => p.currentStatus === "RAC");
          if (racPax) {
            racPax.currentStatus = "CNF";
            racPax.allocatedCoach = freed.coach;
            racPax.allocatedBerth = freed.berth;
            racPax.berthType = freed.berthType;
            racPax.racOrWlNumber = null;
            if (other.passengers.every((p) => p.currentStatus === "CNF" || p.currentStatus === "CAN")) {
              other.bookingStatus = "CONFIRMED";
            }
            promotedPnrs.push(other.pnr);
            promoted = true;
            break;
          }
        }
      }
      if (!promoted && avail) {
        avail.availableSeats += 1;
      }
    }

    const activeRemaining = booking.passengers.filter((p) => p.currentStatus !== "CAN");
    booking.bookingStatus = activeRemaining.length === 0 ? "CANCELLED" : "PARTIALLY_CANCELLED";

    totalRefund = Number(totalRefund.toFixed(2));
    if (totalRefund > 0) {
      s.user.walletBalance = Number((s.user.walletBalance + totalRefund).toFixed(2));
      s.walletTransactions.unshift({
        id: `wtxn_${Date.now()}`,
        userId: s.user.id,
        txnType: "REFUND",
        amount: totalRefund,
        cashbackAmt: 0,
        balanceAfter: s.user.walletBalance,
        referenceId: pnr,
        description: `Ticket Cancellation Refund (PNR ${pnr}, Deduction ₹${totalDeduction.toFixed(2)})`,
        createdAt: new Date().toISOString(),
      });
    }

    return {
      booking,
      refundAmount: totalRefund,
      deductionAmount: Number(totalDeduction.toFixed(2)),
      promotedPnrs,
      walletBalance: s.user.walletBalance,
    };
  },

  getPnr(pnr: string): BookingDTO | null {
    const s = getStore();
    return s.bookings.find((b) => b.pnr === pnr) ?? null;
  },

  bookUts(payload: {
    ticketCategory: UtsCategoryCode;
    sourceStation: string;
    destStation?: string | null;
    adultCount: number;
    childCount: number;
  }) {
    const s = getStore();
    const ds = getRailwayDataset();
    const stationMap = ds.stationMap;
    const src = stationMap.get(payload.sourceStation);
    if (!src) throw new Error("Invalid source station.");

    let baseFare = 0;
    let validityHours = 2;
    let destCode: string | null = null;
    let destName: string | null = null;

    if (payload.ticketCategory === "PLATFORM_TICKET") {
      baseFare = 10 * payload.adultCount;
      validityHours = 2;
    } else {
      if (!payload.destStation || payload.destStation === payload.sourceStation) {
        throw new Error("Please select a valid destination station.");
      }
      const dst = stationMap.get(payload.destStation);
      if (!dst) throw new Error("Invalid destination station.");
      destCode = dst.stationCode;
      destName = dst.stationName;

      // Haversine approximate distance for unreserved fare
      const dLat = ((dst.latitude - src.latitude) * Math.PI) / 180;
      const dLon = ((dst.longitude - src.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((src.latitude * Math.PI) / 180) *
          Math.cos((dst.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      const km = Math.max(15, Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));
      const perAdult = Math.max(15, Math.round(km * 0.28));
      baseFare = perAdult * payload.adultCount + Math.round(perAdult * 0.5) * payload.childCount;
      if (payload.ticketCategory === "SEASON_PASS") {
        baseFare *= 15;
        validityHours = 24 * 30;
      } else {
        validityHours = 3;
      }
    }

    // 3% R-Wallet UTS discount
    const discountApplied = Number((baseFare * 0.03).toFixed(2));
    const farePaid = Number((baseFare - discountApplied).toFixed(2));

    if (s.user.walletBalance < farePaid) {
      throw new Error(`Insufficient R-Wallet balance. Needed ₹${farePaid.toFixed(2)}.`);
    }

    s.user.walletBalance = Number((s.user.walletBalance - farePaid).toFixed(2));
    const now = new Date();
    const validUntil = new Date(now.getTime() + validityHours * 60 * 60 * 1000);
    const utsNumber = generateUtsNumber();

    const qrSignatureHash = signUtsQrPayload({
      utsNumber,
      sourceStation: src.stationCode,
      destStation: destCode,
      category: payload.ticketCategory,
      validUntil: validUntil.toISOString(),
      farePaid,
    });

    const ticket: UtsTicketDTO = {
      utsNumber,
      userId: s.user.id,
      ticketCategory: payload.ticketCategory,
      sourceStation: src.stationCode,
      sourceStationName: src.stationName,
      destStation: destCode,
      destStationName: destName,
      adultCount: payload.adultCount,
      childCount: payload.childCount,
      farePaid,
      discountApplied,
      qrSignatureHash,
      validFrom: now.toISOString(),
      validUntil: validUntil.toISOString(),
      createdAt: now.toISOString(),
    };

    s.utsTickets.unshift(ticket);
    s.walletTransactions.unshift({
      id: `wtxn_${Date.now()}`,
      userId: s.user.id,
      txnType: "DEBIT",
      amount: farePaid,
      cashbackAmt: discountApplied,
      balanceAfter: s.user.walletBalance,
      referenceId: utsNumber,
      description: `UTS ${payload.ticketCategory.replace("_", " ")} (${src.stationCode}${destCode ? `→${destCode}` : ""}) - 3% R-Wallet Bonus`,
      createdAt: now.toISOString(),
    });

    return { ticket, walletBalance: s.user.walletBalance };
  },

  getLiveStatus(trainNumber: string): LiveTrainStatusDTO {
    const s = getStore();
    const ds = getRailwayDataset();
    const train = ds.trainMap.get(trainNumber);
    if (!train) throw new Error(`Train ${trainNumber} not found.`);

    const today = getDateStringOffset(0);
    const scheduleId = `sch_${trainNumber}_${today}`;
    let live = s.liveTrackings.find((lt) => lt.scheduleId === scheduleId);
    if (!live) {
      live = {
        scheduleId,
        lastCrossedIndex: 0,
        delayMinutes: 0,
        updatedAt: new Date().toISOString(),
      };
      s.liveTrackings.push(live);
    }

    const stationMap = ds.stationMap;
    const lastIdx = Math.min(live.lastCrossedIndex, train.stops.length - 1);
    const nextIdx = Math.min(lastIdx + 1, train.stops.length - 1);

    const lastStop = train.stops[lastIdx];
    const nextStop = train.stops[nextIdx];
    const lastStn = stationMap.get(lastStop.stationCode)!;
    const nextStn = stationMap.get(nextStop.stationCode)!;

    const stops: LiveStatusStopDTO[] = train.stops.map((st, idx) => {
      const stn = stationMap.get(st.stationCode)!;
      const status: LiveStatusStopDTO["status"] =
        idx < lastIdx ? "CROSSED" : idx === lastIdx ? "CURRENT" : "UPCOMING";
      return {
        stopSequence: st.stopSequence,
        stationCode: st.stationCode,
        stationName: stn.stationName,
        dayOfJourney: st.dayOfJourney,
        scheduledArrival: st.scheduledArrival,
        scheduledDeparture: st.scheduledDeparture,
        actualArrival: addMinutesToHHMM(st.scheduledArrival, live!.delayMinutes),
        actualDeparture: addMinutesToHHMM(st.scheduledDeparture, live!.delayMinutes),
        haltMinutes: st.haltMinutes,
        distanceFromOriginKm: st.distanceFromOriginKm,
        platform: st.defaultPlatform,
        status,
        delayMinutes: live!.delayMinutes,
      };
    });

    const progressPercent = Math.round((lastIdx / Math.max(1, train.stops.length - 1)) * 100);

    return {
      scheduleId,
      trainNumber: train.trainNumber,
      trainName: train.trainName,
      trainType: train.trainType,
      journeyDate: today,
      lastCrossedStation: lastStop.stationCode,
      lastCrossedStationName: lastStn.stationName,
      nextStation: nextStop.stationCode,
      nextStationName: nextStn.stationName,
      delayMinutes: live.delayMinutes,
      currentLat: Number(((lastStn.latitude + nextStn.latitude) / 2).toFixed(4)),
      currentLng: Number(((lastStn.longitude + nextStn.longitude) / 2).toFixed(4)),
      updatedAt: live.updatedAt,
      progressPercent,
      stops,
    };
  },

  simulateNextStop(trainNumber: string): LiveTrainStatusDTO {
    const s = getStore();
    const ds = getRailwayDataset();
    const train = ds.trainMap.get(trainNumber);
    if (!train) throw new Error(`Train ${trainNumber} not found.`);

    const today = getDateStringOffset(0);
    const scheduleId = `sch_${trainNumber}_${today}`;
    let live = s.liveTrackings.find((lt) => lt.scheduleId === scheduleId);
    if (!live) {
      live = {
        scheduleId,
        lastCrossedIndex: 0,
        delayMinutes: 0,
        updatedAt: new Date().toISOString(),
      };
      s.liveTrackings.push(live);
    }

    if (live.lastCrossedIndex < train.stops.length - 1) {
      live.lastCrossedIndex += 1;
      // Simulate minor realistic variance (-2 to +7 min)
      const delta = Math.floor(Math.random() * 10) - 2;
      live.delayMinutes = Math.max(0, live.delayMinutes + delta);
    } else {
      // Reset back to origin for continuous demoing
      live.lastCrossedIndex = 0;
      live.delayMinutes = 0;
    }
    live.updatedAt = new Date().toISOString();

    return this.getLiveStatus(trainNumber);
  },

  getCoachMap(trainNumber: string): { trainNumber: string; trainName: string; coaches: TrainCoachDTO[] } {
    const s = getStore();
    const ds = getRailwayDataset();
    const train = ds.trainMap.get(trainNumber);
    if (!train) throw new Error(`Train ${trainNumber} not found.`);

    const today = getDateStringOffset(0);
    const scheduleId = `sch_${trainNumber}_${today}`;

    const bookedSeatMap = new Map<string, { passengerName: string; pnr: string }>();
    for (const b of s.bookings) {
      if (b.scheduleId === scheduleId && b.bookingStatus !== "CANCELLED") {
        for (const p of b.passengers) {
          if (p.currentStatus !== "CAN" && p.allocatedCoach && p.allocatedBerth) {
            bookedSeatMap.set(`${p.allocatedCoach}_${p.allocatedBerth}`, {
              passengerName: p.name,
              pnr: b.pnr,
            });
          }
        }
      }
    }

    const coaches: TrainCoachDTO[] = train.rake.map((rc, idx) => {
      const coachId = `coach_${train.trainNumber}_${rc.coachCode}`;
      const rawSeats = buildSeatListForCoach(coachId, rc.coachClass);
      const seats = rawSeats.map((seat) => {
        const booked = bookedSeatMap.get(`${rc.coachCode}_${seat.berthNumber}`);
        return {
          ...seat,
          occupied: Boolean(booked),
          passengerName: booked?.passengerName,
          pnr: booked?.pnr,
        };
      });
      return {
        id: coachId,
        trainNumber: train.trainNumber,
        coachCode: rc.coachCode,
        coachClass: rc.coachClass,
        rakePosition: idx + 1,
        totalBerths: seats.length,
        seats,
      };
    });

    return {
      trainNumber: train.trainNumber,
      trainName: train.trainName,
      coaches,
    };
  },

  createEcateringOrder(payload: {
    pnr: string;
    stationCode: string;
    vendorName: string;
    items: { name: string; qty: number; price: number }[];
  }): EcateringOrderDTO {
    const s = getStore();
    const booking = s.bookings.find((b) => b.pnr === payload.pnr);
    if (!booking) throw new Error("Valid PNR is required for E-Catering.");

    const activePax = booking.passengers.find((p) => p.currentStatus !== "CAN" && p.allocatedCoach);
    const deliveryCoach = activePax?.allocatedCoach ?? "B1";
    const deliveryBerth = activePax?.allocatedBerth ?? 12;

    const totalAmount = payload.items.reduce((acc, item) => acc + item.price * item.qty, 0);
    if (totalAmount <= 0) throw new Error("Select at least one food item.");

    if (s.user.walletBalance < totalAmount) {
      throw new Error(`Insufficient R-Wallet balance. Needed ₹${totalAmount.toFixed(2)}.`);
    }

    s.user.walletBalance = Number((s.user.walletBalance - totalAmount).toFixed(2));
    const stationMap = new Map(s.stations.map((st) => [st.stationCode, st]));

    const order: EcateringOrderDTO = {
      id: `ecat_${Date.now()}`,
      userId: s.user.id,
      pnr: booking.pnr,
      stationCode: payload.stationCode,
      stationName: stationMap.get(payload.stationCode)?.stationName ?? payload.stationCode,
      vendorName: payload.vendorName,
      items: payload.items,
      totalAmount,
      deliveryCoach,
      deliveryBerth,
      status: "CONFIRMED",
      createdAt: new Date().toISOString(),
    };

    s.ecateringOrders.unshift(order);
    s.walletTransactions.unshift({
      id: `wtxn_${Date.now()}`,
      userId: s.user.id,
      txnType: "DEBIT",
      amount: totalAmount,
      cashbackAmt: 0,
      balanceAfter: s.user.walletBalance,
      referenceId: order.id,
      description: `IRCTC E-Catering (${payload.vendorName} at ${payload.stationCode})`,
      createdAt: new Date().toISOString(),
    });

    return order;
  },

  createRailMadadComplaint(payload: {
    pnr?: string | null;
    trainNumber: string;
    category: ComplaintCategoryCode;
    description: string;
    coachNumber?: string | null;
  }): RailMadadComplaintDTO {
    const s = getStore();
    const ds = getRailwayDataset();
    const train = ds.trainMap.get(payload.trainNumber);
    if (!train) throw new Error("Invalid train number.");

    const complaint: RailMadadComplaintDTO = {
      id: `rm_${Date.now()}`,
      referenceNo: generateComplaintRef(),
      userId: s.user.id,
      pnr: payload.pnr || null,
      trainNumber: payload.trainNumber,
      trainName: train.trainName,
      category: payload.category,
      description: payload.description,
      coachNumber: payload.coachNumber || null,
      status: "ASSIGNED",
      resolution: "Assigned to On-Board Housekeeping / Train Superintendent (TS).",
      createdAt: new Date().toISOString(),
    };

    s.complaints.unshift(complaint);
    return complaint;
  },
};
