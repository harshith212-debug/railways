import { NextRequest, NextResponse } from "next/server";
import { isPostgresAvailable, prisma } from "@/lib/prisma";
import { memoryStore } from "@/lib/memory-store";
import { generateUtsNumber, signUtsQrPayload } from "@/lib/railway-logic";
import { SEED_USER } from "@/lib/seed-data";
import { UtsCategoryCode } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ticketCategory = body.ticketCategory as UtsCategoryCode;
    const sourceStation = String(body.sourceStation || "").toUpperCase();
    const destStation = body.destStation ? String(body.destStation).toUpperCase() : null;
    const adultCount = Math.max(1, Number(body.adultCount || 1));
    const childCount = Math.max(0, Number(body.childCount || 0));

    if (!(await isPostgresAvailable())) {
      const result = memoryStore.bookUts({
        ticketCategory,
        sourceStation,
        destStation,
        adultCount,
        childCount,
      });
      return NextResponse.json(result);
    }

    const result = await prisma.$transaction(async (tx) => {
      const src = await tx.station.findUnique({ where: { stationCode: sourceStation } });
      if (!src) throw new Error("Invalid source station.");

      let baseFare = 0;
      let validityHours = 2;
      let dstName: string | null = null;

      if (ticketCategory === "PLATFORM_TICKET") {
        baseFare = 10 * adultCount;
        validityHours = 2;
      } else {
        if (!destStation || destStation === sourceStation) {
          throw new Error("Please select a valid destination station.");
        }
        const dst = await tx.station.findUnique({ where: { stationCode: destStation } });
        if (!dst) throw new Error("Invalid destination station.");
        dstName = dst.stationName;

        const dLat = ((dst.latitude - src.latitude) * Math.PI) / 180;
        const dLon = ((dst.longitude - src.longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((src.latitude * Math.PI) / 180) *
            Math.cos((dst.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
        const km = Math.max(15, Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));
        const perAdult = Math.max(15, Math.round(km * 0.28));
        baseFare = perAdult * adultCount + Math.round(perAdult * 0.5) * childCount;
        if (ticketCategory === "SEASON_PASS") {
          baseFare *= 15;
          validityHours = 24 * 30;
        } else {
          validityHours = 3;
        }
      }

      const discountApplied = Number((baseFare * 0.03).toFixed(2));
      const farePaid = Number((baseFare - discountApplied).toFixed(2));

      const user = await tx.user.findUnique({ where: { id: SEED_USER.id } });
      if (!user || Number(user.walletBalance) < farePaid) {
        throw new Error(`Insufficient R-Wallet balance. Required ₹${farePaid.toFixed(2)}.`);
      }

      const updatedUser = await tx.user.update({
        where: { id: SEED_USER.id },
        data: { walletBalance: { decrement: farePaid } },
      });

      const now = new Date();
      const validUntil = new Date(now.getTime() + validityHours * 60 * 60 * 1000);
      const utsNumber = generateUtsNumber();
      const qrSignatureHash = signUtsQrPayload({
        utsNumber,
        sourceStation,
        destStation,
        category: ticketCategory,
        validUntil: validUntil.toISOString(),
        farePaid,
      });

      const created = await tx.utsTicket.create({
        data: {
          utsNumber,
          userId: SEED_USER.id,
          ticketCategory,
          sourceStation,
          destStation,
          adultCount,
          childCount,
          farePaid,
          discountApplied,
          qrSignatureHash,
          validFrom: now,
          validUntil,
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: SEED_USER.id,
          txnType: "DEBIT",
          amount: farePaid,
          cashbackAmt: discountApplied,
          balanceAfter: updatedUser.walletBalance,
          referenceId: utsNumber,
          description: `UTS ${ticketCategory} (${sourceStation}${destStation ? `→${destStation}` : ""})`,
        },
      });

      return {
        ticket: {
          utsNumber: created.utsNumber,
          userId: created.userId,
          ticketCategory: created.ticketCategory,
          sourceStation: created.sourceStation,
          sourceStationName: src.stationName,
          destStation: created.destStation,
          destStationName: dstName,
          adultCount: created.adultCount,
          childCount: created.childCount,
          farePaid: Number(created.farePaid),
          discountApplied: Number(created.discountApplied),
          qrSignatureHash: created.qrSignatureHash,
          validFrom: created.validFrom.toISOString(),
          validUntil: created.validUntil.toISOString(),
          createdAt: created.createdAt.toISOString(),
        },
        walletBalance: Number(updatedUser.walletBalance),
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "UTS booking failed." },
      { status: 400 }
    );
  }
}
