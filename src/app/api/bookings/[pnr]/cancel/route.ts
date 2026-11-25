import { NextRequest, NextResponse } from "next/server";
import { isPostgresAvailable, prisma } from "@/lib/prisma";
import { memoryStore } from "@/lib/memory-store";
import { CLASS_DISPLAY_MAP, computeCancellationDeduction } from "@/lib/railway-logic";
import { SEED_USER } from "@/lib/seed-data";

export async function POST(
  req: NextRequest,
  context: { params: { pnr: string } }
) {
  try {
    const pnr = context.params.pnr;
    const body = await req.json().catch(() => ({}));
    const passengerIds = Array.isArray(body.passengerIds) ? (body.passengerIds as string[]) : undefined;

    if (!(await isPostgresAvailable())) {
      const result = memoryStore.cancelBooking(pnr, passengerIds);
      return NextResponse.json(result);
    }

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { pnr },
        include: {
          passengers: true,
          fromStn: true,
          toStn: true,
          schedule: { include: { train: { include: { routes: true } } } },
        },
      });
      if (!booking) throw new Error("PNR not found.");
      if (booking.bookingStatus === "CANCELLED") throw new Error("Ticket already cancelled.");

      const targets = passengerIds?.length
        ? booking.passengers.filter((p) => passengerIds.includes(p.passengerId) && p.currentStatus !== "CAN")
        : booking.passengers.filter((p) => p.currentStatus !== "CAN");

      if (!targets.length) throw new Error("No active passengers selected.");

      const farePerPax =
        (Number(booking.totalFare) - Number(booking.convenienceFee)) /
        Math.max(1, booking.passengers.length);

      let totalRefund = 0;
      let totalDeduction = 0;
      const freedBerths: { coach: string; berth: number; berthType: any }[] = [];

      for (const pax of targets) {
        const calc = computeCancellationDeduction({
          coachClass: booking.coachClass,
          status: pax.currentStatus,
          farePerPassenger: farePerPax,
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

        await tx.bookingPassenger.update({
          where: { passengerId: pax.passengerId },
          data: { currentStatus: "CAN" },
        });
      }

      const promotedPnrs: string[] = [];
      for (const freed of freedBerths) {
        const racPax = await tx.bookingPassenger.findFirst({
          where: {
            currentStatus: "RAC",
            booking: { scheduleId: booking.scheduleId, coachClass: booking.coachClass },
          },
          orderBy: { racOrWlNumber: "asc" },
        });

        if (racPax) {
          await tx.bookingPassenger.update({
            where: { passengerId: racPax.passengerId },
            data: {
              currentStatus: "CNF",
              allocatedCoach: freed.coach,
              allocatedBerth: freed.berth,
              berthType: freed.berthType,
              racOrWlNumber: null,
            },
          });
          promotedPnrs.push(racPax.pnr);
        } else {
          await tx.seatAvailability.updateMany({
            where: {
              scheduleId: booking.scheduleId,
              coachClass: booking.coachClass,
              quota: booking.quota,
            },
            data: { availableSeats: { increment: 1 } },
          });
        }
      }

      const remainingActive = booking.passengers.length - targets.length;
      const newStatus = remainingActive <= 0 ? "CANCELLED" : "PARTIALLY_CANCELLED";

      const updatedBooking = await tx.booking.update({
        where: { pnr },
        data: { bookingStatus: newStatus },
        include: { passengers: true },
      });

      totalRefund = Number(totalRefund.toFixed(2));
      let walletBalance = 0;
      if (totalRefund > 0) {
        const updatedUser = await tx.user.update({
          where: { id: SEED_USER.id },
          data: { walletBalance: { increment: totalRefund } },
        });
        walletBalance = Number(updatedUser.walletBalance);
        await tx.walletTransaction.create({
          data: {
            userId: SEED_USER.id,
            txnType: "REFUND",
            amount: totalRefund,
            cashbackAmt: 0,
            balanceAfter: walletBalance,
            referenceId: pnr,
            description: `Ticket Cancellation Refund (PNR ${pnr})`,
          },
        });
      } else {
        const u = await tx.user.findUnique({ where: { id: SEED_USER.id } });
        walletBalance = Number(u?.walletBalance ?? 0);
      }

      const fromRoute = booking.schedule.train.routes.find((r) => r.stationCode === booking.fromStation);
      const toRoute = booking.schedule.train.routes.find((r) => r.stationCode === booking.toStation);

      return {
        booking: {
          pnr: updatedBooking.pnr,
          userId: updatedBooking.userId,
          scheduleId: updatedBooking.scheduleId,
          trainNumber: booking.schedule.trainNumber,
          trainName: booking.schedule.train.trainName,
          trainType: booking.schedule.train.trainType,
          journeyDate: booking.schedule.journeyDate.toISOString().slice(0, 10),
          fromStation: booking.fromStation,
          fromStationName: booking.fromStn.stationName,
          toStation: booking.toStation,
          toStationName: booking.toStn.stationName,
          boardingStation: booking.boardingStation,
          departureTime: fromRoute?.scheduledDeparture ?? "00:00",
          arrivalTime: toRoute?.scheduledArrival ?? "00:00",
          distanceKm: (toRoute?.distanceFromOriginKm ?? 0) - (fromRoute?.distanceFromOriginKm ?? 0),
          coachClass: updatedBooking.coachClass,
          displayClass: CLASS_DISPLAY_MAP[updatedBooking.coachClass],
          quota: updatedBooking.quota,
          totalFare: Number(updatedBooking.totalFare),
          convenienceFee: Number(updatedBooking.convenienceFee),
          gstAmount: Number(updatedBooking.gstAmount),
          bookingStatus: updatedBooking.bookingStatus,
          paymentMode: updatedBooking.paymentMode,
          chartPrepared: booking.schedule.chartPrepared,
          createdAt: updatedBooking.createdAt.toISOString(),
          passengers: updatedBooking.passengers,
        },
        refundAmount: totalRefund,
        deductionAmount: Number(totalDeduction.toFixed(2)),
        promotedPnrs,
        walletBalance,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cancellation failed." },
      { status: 400 }
    );
  }
}
