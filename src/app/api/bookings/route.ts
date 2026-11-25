import { NextRequest, NextResponse } from "next/server";
import { isPostgresAvailable, prisma } from "@/lib/prisma";
import { memoryStore } from "@/lib/memory-store";
import {
  CLASS_DISPLAY_MAP,
  calculateSegmentFare,
  generatePnr,
} from "@/lib/railway-logic";
import { SEED_USER } from "@/lib/seed-data";
import { BerthTypeCode, CoachClassCode, GenderCode, QuotaCode } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      scheduleId,
      fromStation,
      toStation,
      boardingStation,
      coachClass,
      quota,
      paymentMode = "R_WALLET",
      passengers,
    } = body as {
      scheduleId: string;
      fromStation: string;
      toStation: string;
      boardingStation?: string;
      coachClass: CoachClassCode;
      quota: QuotaCode;
      paymentMode?: "R_WALLET" | "UPI";
      passengers: {
        name: string;
        age: number;
        gender: GenderCode;
        berthPreference?: BerthTypeCode | null;
      }[];
    };

    if (!scheduleId || !fromStation || !toStation || !coachClass || !quota || !passengers?.length) {
      return NextResponse.json({ error: "Missing required booking fields." }, { status: 400 });
    }

    if (!(await isPostgresAvailable())) {
      const booking = memoryStore.createBooking({
        scheduleId,
        fromStation,
        toStation,
        boardingStation,
        coachClass,
        quota,
        paymentMode,
        passengers,
      });
      return NextResponse.json({
        booking,
        walletBalance: memoryStore.getBootstrapData().user.walletBalance,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const schedule = await tx.trainSchedule.findUnique({
        where: { id: scheduleId },
        include: {
          train: {
            include: {
              routes: { include: { station: true } },
              coaches: {
                where: { coachClass },
                orderBy: { rakePosition: "asc" },
                include: { seats: { orderBy: { berthNumber: "asc" } } },
              },
            },
          },
        },
      });

      if (!schedule) throw new Error("Train schedule not found.");

      const fromStop = schedule.train.routes.find((r) => r.stationCode === fromStation);
      const toStop = schedule.train.routes.find((r) => r.stationCode === toStation);
      if (!fromStop || !toStop || fromStop.stopSequence >= toStop.stopSequence) {
        throw new Error("Invalid station segment.");
      }

      const avail = await tx.seatAvailability.findUnique({
        where: {
          scheduleId_coachClass_quota: { scheduleId, coachClass, quota },
        },
      });
      if (!avail) throw new Error("Class/Quota availability record not found.");

      const distanceKm = toStop.distanceFromOriginKm - fromStop.distanceFromOriginKm;
      const fareCalc = calculateSegmentFare({
        distanceKm,
        coachClass,
        quota,
        trainType: schedule.train.trainType,
      });

      const count = passengers.length;
      const totalGst = fareCalc.gstAmount * count;
      const totalFare = Number(
        (fareCalc.baseFare * count + totalGst + fareCalc.convenienceFee).toFixed(2)
      );

      let walletBalanceAfter = 0;
      const user = await tx.user.findUnique({ where: { id: SEED_USER.id } });
      if (!user) throw new Error("User not found.");

      if (paymentMode === "R_WALLET") {
        if (Number(user.walletBalance) < totalFare) {
          throw new Error(`Insufficient R-Wallet balance. Required ₹${totalFare.toFixed(2)}.`);
        }
        const updatedUser = await tx.user.update({
          where: { id: SEED_USER.id },
          data: { walletBalance: { decrement: totalFare } },
        });
        walletBalanceAfter = Number(updatedUser.walletBalance);
      } else {
        walletBalanceAfter = Number(user.walletBalance);
      }

      // Occupied berths on this schedule
      const existingBookings = await tx.booking.findMany({
        where: { scheduleId, bookingStatus: { not: "CANCELLED" } },
        include: { passengers: true },
      });
      const occupiedKeys = new Set<string>();
      for (const b of existingBookings) {
        for (const p of b.passengers) {
          if (p.currentStatus !== "CAN" && p.allocatedCoach && p.allocatedBerth) {
            occupiedKeys.add(`${p.allocatedCoach}_${p.allocatedBerth}`);
          }
        }
      }

      const freeSeats: { coachCode: string; berthNumber: number; berthType: BerthTypeCode }[] = [];
      for (const coach of schedule.train.coaches) {
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

      let remainingAvail = avail.availableSeats;
      let racCounter = avail.racCount;
      let wlCounter = avail.wlCount;
      let hasRac = false;
      let hasWl = false;

      const paxCreates = passengers.map((pax) => {
        if (remainingAvail > 0 && freeSeats.length > 0) {
          remainingAvail -= 1;
          let idx = pax.berthPreference
            ? freeSeats.findIndex((fs) => fs.berthType === pax.berthPreference)
            : 0;
          if (idx === -1) idx = 0;
          const chosen = freeSeats.splice(idx, 1)[0];
          return {
            name: pax.name,
            age: pax.age,
            gender: pax.gender,
            berthPreference: pax.berthPreference ?? null,
            bookingStatus: "CNF" as const,
            currentStatus: "CNF" as const,
            allocatedCoach: chosen.coachCode,
            allocatedBerth: chosen.berthNumber,
            berthType: chosen.berthType,
            racOrWlNumber: null,
          };
        } else if (racCounter < 12) {
          racCounter += 1;
          hasRac = true;
          return {
            name: pax.name,
            age: pax.age,
            gender: pax.gender,
            berthPreference: pax.berthPreference ?? null,
            bookingStatus: "RAC" as const,
            currentStatus: "RAC" as const,
            allocatedCoach: schedule.train.coaches[0]?.coachCode ?? "B1",
            allocatedBerth: 7,
            berthType: "SL" as const,
            racOrWlNumber: racCounter,
          };
        } else {
          wlCounter += 1;
          hasWl = true;
          return {
            name: pax.name,
            age: pax.age,
            gender: pax.gender,
            berthPreference: pax.berthPreference ?? null,
            bookingStatus: "WL" as const,
            currentStatus: "WL" as const,
            allocatedCoach: null,
            allocatedBerth: null,
            berthType: null,
            racOrWlNumber: wlCounter,
          };
        }
      });

      await tx.seatAvailability.update({
        where: { id: avail.id },
        data: {
          availableSeats: remainingAvail,
          racCount: racCounter,
          wlCount: wlCounter,
        },
      });

      const pnr = generatePnr();
      const created = await tx.booking.create({
        data: {
          pnr,
          userId: SEED_USER.id,
          scheduleId,
          fromStation,
          toStation,
          boardingStation: boardingStation || fromStation,
          coachClass,
          quota,
          totalFare,
          convenienceFee: fareCalc.convenienceFee,
          gstAmount: totalGst,
          bookingStatus: hasWl ? "WAITLISTED" : hasRac ? "RAC" : "CONFIRMED",
          paymentMode,
          passengers: { create: paxCreates },
        },
        include: { passengers: true },
      });

      if (paymentMode === "R_WALLET") {
        await tx.walletTransaction.create({
          data: {
            userId: SEED_USER.id,
            txnType: "DEBIT",
            amount: totalFare,
            cashbackAmt: 0,
            balanceAfter: walletBalanceAfter,
            referenceId: pnr,
            description: `IRCTC Ticket Booking (${schedule.trainNumber} ${fromStation}-${toStation})`,
          },
        });
      }

      return {
        booking: {
          pnr: created.pnr,
          userId: created.userId,
          scheduleId: created.scheduleId,
          trainNumber: schedule.trainNumber,
          trainName: schedule.train.trainName,
          trainType: schedule.train.trainType,
          journeyDate: schedule.journeyDate.toISOString().slice(0, 10),
          fromStation,
          fromStationName: fromStop.station.stationName,
          toStation,
          toStationName: toStop.station.stationName,
          boardingStation: created.boardingStation,
          departureTime: fromStop.scheduledDeparture ?? "00:00",
          arrivalTime: toStop.scheduledArrival ?? "00:00",
          distanceKm,
          coachClass: created.coachClass,
          displayClass: CLASS_DISPLAY_MAP[created.coachClass],
          quota: created.quota,
          totalFare: Number(created.totalFare),
          convenienceFee: Number(created.convenienceFee),
          gstAmount: Number(created.gstAmount),
          bookingStatus: created.bookingStatus,
          paymentMode: created.paymentMode,
          chartPrepared: schedule.chartPrepared,
          createdAt: created.createdAt.toISOString(),
          passengers: created.passengers,
        },
        walletBalance: walletBalanceAfter,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Booking failed." },
      { status: 400 }
    );
  }
}
