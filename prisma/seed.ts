import { PrismaClient } from "@prisma/client";
import {
  SEED_MASTER_PASSENGERS,
  SEED_STATIONS,
  SEED_TRAINS,
  SEED_USER,
  buildInitialAvailabilityForSchedule,
  buildSampleUtsTicket,
  buildSeatListForCoach,
  getDateStringOffset,
} from "../src/lib/seed-data";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding RailOne PostgreSQL database...");

  // 1. User
  await prisma.user.upsert({
    where: { id: SEED_USER.id },
    update: {},
    create: {
      id: SEED_USER.id,
      irctcUsername: SEED_USER.irctcUsername,
      fullName: SEED_USER.fullName,
      email: SEED_USER.email,
      phone: SEED_USER.phone,
      passwordHash: SEED_USER.passwordHash,
      mpinHash: SEED_USER.mpinHash,
      aadhaarVerified: SEED_USER.aadhaarVerified,
      walletBalance: SEED_USER.walletBalance,
    },
  });

  // 2. Master Passengers
  for (const mp of SEED_MASTER_PASSENGERS) {
    await prisma.masterPassenger.upsert({
      where: { id: mp.id },
      update: {},
      create: mp,
    });
  }

  // 3. Initial Wallet Ledger Entry
  await prisma.walletTransaction.upsert({
    where: { id: "wtxn_seed_init" },
    update: {},
    create: {
      id: "wtxn_seed_init",
      userId: SEED_USER.id,
      txnType: "CREDIT",
      amount: 4250.0,
      cashbackAmt: 0,
      balanceAfter: 4250.0,
      referenceId: "UPI-INIT-90421",
      description: "Initial R-Wallet Top-up via BHIM UPI",
    },
  });

  // 4. Stations (15 Major Stations)
  for (const st of SEED_STATIONS) {
    await prisma.station.upsert({
      where: { stationCode: st.stationCode },
      update: st,
      create: st,
    });
  }

  // 5. Trains, Routes, Coaches & Seats
  for (const tr of SEED_TRAINS) {
    await prisma.train.upsert({
      where: { trainNumber: tr.trainNumber },
      update: {
        trainName: tr.trainName,
        trainType: tr.trainType,
        runningDays: tr.runningDays,
        hasPantry: tr.hasPantry,
        avgSpeedKmph: tr.avgSpeedKmph,
      },
      create: {
        trainNumber: tr.trainNumber,
        trainName: tr.trainName,
        trainType: tr.trainType,
        runningDays: tr.runningDays,
        hasPantry: tr.hasPantry,
        avgSpeedKmph: tr.avgSpeedKmph,
      },
    });

    for (const stop of tr.stops) {
      await prisma.trainRoute.upsert({
        where: {
          trainNumber_stopSequence: {
            trainNumber: tr.trainNumber,
            stopSequence: stop.stopSequence,
          },
        },
        update: stop,
        create: {
          trainNumber: tr.trainNumber,
          ...stop,
        },
      });
    }

    for (let idx = 0; idx < tr.rake.length; idx++) {
      const rc = tr.rake[idx];
      const coachId = `coach_${tr.trainNumber}_${rc.coachCode}`;
      const seats = buildSeatListForCoach(coachId, rc.coachClass);

      await prisma.trainCoach.upsert({
        where: { id: coachId },
        update: {},
        create: {
          id: coachId,
          trainNumber: tr.trainNumber,
          coachCode: rc.coachCode,
          coachClass: rc.coachClass,
          rakePosition: idx + 1,
          totalBerths: seats.length,
        },
      });

      for (const s of seats) {
        await prisma.coachSeat.upsert({
          where: { id: s.id },
          update: {},
          create: s,
        });
      }
    }

    // 6. Schedules for today + next 7 days
    for (let day = 0; day <= 7; day++) {
      const dateStr = getDateStringOffset(day);
      const scheduleId = `sch_${tr.trainNumber}_${dateStr}`;
      await prisma.trainSchedule.upsert({
        where: { id: scheduleId },
        update: {},
        create: {
          id: scheduleId,
          trainNumber: tr.trainNumber,
          journeyDate: new Date(`${dateStr}T00:00:00.000Z`),
          chartPrepared: false,
          status: "ON_TIME",
        },
      });

      const avails = buildInitialAvailabilityForSchedule(scheduleId, tr);
      for (const av of avails) {
        await prisma.seatAvailability.upsert({
          where: { id: av.id },
          update: {},
          create: av,
        });
      }

      // Live tracking for today's schedule
      if (day === 0 && tr.stops.length >= 2) {
        const originSt = SEED_STATIONS.find((s) => s.stationCode === tr.stops[0].stationCode)!;
        await prisma.liveTrainTracking.upsert({
          where: { scheduleId },
          update: {},
          create: {
            scheduleId,
            lastCrossedStation: tr.stops[0].stationCode,
            nextStation: tr.stops[1].stationCode,
            delayMinutes: tr.trainNumber === "12621" ? 18 : 0,
            currentLat: originSt.latitude,
            currentLng: originSt.longitude,
          },
        });
      }
    }
  }

  const today = getDateStringOffset(0);

  // 7. Sample Booking 1: Confirmed (CNF) on 12723 Telangana Express
  await prisma.booking.upsert({
    where: { pnr: "4218905632" },
    update: {},
    create: {
      pnr: "4218905632",
      userId: SEED_USER.id,
      scheduleId: `sch_12723_${today}`,
      fromStation: "SC",
      toStation: "NDLS",
      boardingStation: "SC",
      coachClass: "THREE_A",
      quota: "GN",
      totalFare: 5835.4,
      convenienceFee: 35.4,
      gstAmount: 276.0,
      bookingStatus: "CONFIRMED",
      paymentMode: "R_WALLET",
      passengers: {
        create: [
          {
            passengerId: "pax_seed_1",
            name: "Arjun Sharma",
            age: 29,
            gender: "MALE",
            berthPreference: "LB",
            bookingStatus: "CNF",
            currentStatus: "CNF",
            allocatedCoach: "B1",
            allocatedBerth: 17,
            berthType: "LB",
          },
          {
            passengerId: "pax_seed_2",
            name: "Priya Sharma",
            age: 27,
            gender: "FEMALE",
            berthPreference: "SL",
            bookingStatus: "CNF",
            currentStatus: "CNF",
            allocatedCoach: "B1",
            allocatedBerth: 23,
            berthType: "SL",
          },
        ],
      },
    },
  });

  // 8. Sample Booking 2: RAC on 12621 Tamil Nadu Express
  await prisma.booking.upsert({
    where: { pnr: "6540129847" },
    update: {},
    create: {
      pnr: "6540129847",
      userId: SEED_USER.id,
      scheduleId: `sch_12621_${today}`,
      fromStation: "MAS",
      toStation: "NDLS",
      boardingStation: "MAS",
      coachClass: "THREE_A",
      quota: "GN",
      totalFare: 3825.4,
      convenienceFee: 35.4,
      gstAmount: 180.0,
      bookingStatus: "RAC",
      paymentMode: "R_WALLET",
      passengers: {
        create: [
          {
            passengerId: "pax_seed_3",
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
      },
    },
  });

  // 9. Active UTS Platform QR Pass
  const uts = buildSampleUtsTicket();
  await prisma.utsTicket.upsert({
    where: { utsNumber: uts.utsNumber },
    update: {},
    create: {
      utsNumber: uts.utsNumber,
      userId: uts.userId,
      ticketCategory: uts.ticketCategory,
      sourceStation: uts.sourceStation,
      destStation: uts.destStation,
      adultCount: uts.adultCount,
      childCount: uts.childCount,
      farePaid: uts.farePaid,
      discountApplied: uts.discountApplied,
      qrSignatureHash: uts.qrSignatureHash,
      validFrom: new Date(uts.validFrom),
      validUntil: new Date(uts.validUntil),
    },
  });

  console.log("RailOne seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
