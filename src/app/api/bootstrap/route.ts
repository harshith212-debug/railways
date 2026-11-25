import { NextResponse } from "next/server";
import { isPostgresAvailable, prisma } from "@/lib/prisma";
import { memoryStore } from "@/lib/memory-store";
import { CLASS_DISPLAY_MAP } from "@/lib/railway-logic";
import { SEED_USER } from "@/lib/seed-data";

export async function GET() {
  try {
    const usePg = await isPostgresAvailable();
    if (!usePg) {
      return NextResponse.json(memoryStore.getBootstrapData());
    }

    const [user, stations, trains, bookings, utsTickets, ecateringOrders, complaints] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: SEED_USER.id },
          include: {
            masterPassengers: true,
            walletTransactions: { orderBy: { createdAt: "desc" }, take: 25 },
          },
        }),
        prisma.station.findMany({ orderBy: { stationCode: "asc" } }),
        prisma.train.findMany({ orderBy: { trainNumber: "asc" } }),
        prisma.booking.findMany({
          where: { userId: SEED_USER.id },
          orderBy: { createdAt: "desc" },
          include: {
            passengers: true,
            fromStn: true,
            toStn: true,
            schedule: { include: { train: { include: { routes: true } } } },
          },
        }),
        prisma.utsTicket.findMany({
          where: { userId: SEED_USER.id },
          orderBy: { createdAt: "desc" },
          include: { source: true, dest: true },
        }),
        prisma.ecateringOrder.findMany({
          where: { userId: SEED_USER.id },
          orderBy: { createdAt: "desc" },
          include: { station: true },
        }),
        prisma.railMadadComplaint.findMany({
          where: { userId: SEED_USER.id },
          orderBy: { createdAt: "desc" },
          include: { train: true },
        }),
      ]);

    if (!user) {
      return NextResponse.json(memoryStore.getBootstrapData());
    }

    return NextResponse.json({
      mode: "POSTGRESQL",
      user: {
        id: user.id,
        irctcUsername: user.irctcUsername,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        aadhaarVerified: user.aadhaarVerified,
        walletBalance: Number(user.walletBalance),
      },
      masterPassengers: user.masterPassengers,
      walletTransactions: user.walletTransactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
        cashbackAmt: Number(t.cashbackAmt),
        balanceAfter: Number(t.balanceAfter),
        createdAt: t.createdAt.toISOString(),
      })),
      stations,
      trains,
      bookings: bookings.map((b) => {
        const fromRoute = b.schedule.train.routes.find((r) => r.stationCode === b.fromStation);
        const toRoute = b.schedule.train.routes.find((r) => r.stationCode === b.toStation);
        return {
          pnr: b.pnr,
          userId: b.userId,
          scheduleId: b.scheduleId,
          trainNumber: b.schedule.trainNumber,
          trainName: b.schedule.train.trainName,
          trainType: b.schedule.train.trainType,
          journeyDate: b.schedule.journeyDate.toISOString().slice(0, 10),
          fromStation: b.fromStation,
          fromStationName: b.fromStn.stationName,
          toStation: b.toStation,
          toStationName: b.toStn.stationName,
          boardingStation: b.boardingStation,
          departureTime: fromRoute?.scheduledDeparture ?? "00:00",
          arrivalTime: toRoute?.scheduledArrival ?? "00:00",
          distanceKm:
            (toRoute?.distanceFromOriginKm ?? 0) - (fromRoute?.distanceFromOriginKm ?? 0),
          coachClass: b.coachClass,
          displayClass: CLASS_DISPLAY_MAP[b.coachClass],
          quota: b.quota,
          totalFare: Number(b.totalFare),
          convenienceFee: Number(b.convenienceFee),
          gstAmount: Number(b.gstAmount),
          bookingStatus: b.bookingStatus,
          paymentMode: b.paymentMode,
          chartPrepared: b.schedule.chartPrepared,
          createdAt: b.createdAt.toISOString(),
          passengers: b.passengers,
        };
      }),
      utsTickets: utsTickets.map((u) => ({
        utsNumber: u.utsNumber,
        userId: u.userId,
        ticketCategory: u.ticketCategory,
        sourceStation: u.sourceStation,
        sourceStationName: u.source.stationName,
        destStation: u.destStation,
        destStationName: u.dest?.stationName ?? null,
        adultCount: u.adultCount,
        childCount: u.childCount,
        farePaid: Number(u.farePaid),
        discountApplied: Number(u.discountApplied),
        qrSignatureHash: u.qrSignatureHash,
        validFrom: u.validFrom.toISOString(),
        validUntil: u.validUntil.toISOString(),
        createdAt: u.createdAt.toISOString(),
      })),
      ecateringOrders: ecateringOrders.map((e) => ({
        id: e.id,
        userId: e.userId,
        pnr: e.pnr,
        stationCode: e.stationCode,
        stationName: e.station.stationName,
        vendorName: e.vendorName,
        items: e.itemsJson,
        totalAmount: Number(e.totalAmount),
        deliveryCoach: e.deliveryCoach,
        deliveryBerth: e.deliveryBerth,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
      })),
      complaints: complaints.map((c) => ({
        id: c.id,
        referenceNo: c.referenceNo,
        userId: c.userId,
        pnr: c.pnr,
        trainNumber: c.trainNumber,
        trainName: c.train.trainName,
        category: c.category,
        description: c.description,
        coachNumber: c.coachNumber,
        status: c.status,
        resolution: c.resolution,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("Bootstrap error, falling back to memoryStore:", err);
    return NextResponse.json(memoryStore.getBootstrapData());
  }
}
