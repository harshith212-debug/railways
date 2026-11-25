import { NextRequest, NextResponse } from "next/server";
import { isPostgresAvailable, prisma } from "@/lib/prisma";
import { memoryStore } from "@/lib/memory-store";
import { SEED_USER } from "@/lib/seed-data";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pnr, stationCode, vendorName, items } = body as {
      pnr: string;
      stationCode: string;
      vendorName: string;
      items: { name: string; qty: number; price: number }[];
    };

    if (!pnr || !stationCode || !vendorName || !items?.length) {
      return NextResponse.json({ error: "Missing required E-Catering fields." }, { status: 400 });
    }

    if (!(await isPostgresAvailable())) {
      const order = memoryStore.createEcateringOrder({ pnr, stationCode, vendorName, items });
      return NextResponse.json({
        order,
        walletBalance: memoryStore.getBootstrapData().user.walletBalance,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { pnr },
        include: { passengers: true },
      });
      if (!booking) throw new Error("Valid PNR is required.");

      const activePax = booking.passengers.find((p) => p.currentStatus !== "CAN" && p.allocatedCoach);
      const deliveryCoach = activePax?.allocatedCoach ?? "B1";
      const deliveryBerth = activePax?.allocatedBerth ?? 12;
      const totalAmount = items.reduce((sum, i) => sum + i.price * i.qty, 0);

      const user = await tx.user.findUnique({ where: { id: SEED_USER.id } });
      if (!user || Number(user.walletBalance) < totalAmount) {
        throw new Error(`Insufficient R-Wallet balance. Required ₹${totalAmount.toFixed(2)}.`);
      }

      const updatedUser = await tx.user.update({
        where: { id: SEED_USER.id },
        data: { walletBalance: { decrement: totalAmount } },
      });

      const station = await tx.station.findUnique({ where: { stationCode } });
      const created = await tx.ecateringOrder.create({
        data: {
          userId: SEED_USER.id,
          pnr,
          stationCode,
          vendorName,
          itemsJson: items,
          totalAmount,
          deliveryCoach,
          deliveryBerth,
          status: "CONFIRMED",
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: SEED_USER.id,
          txnType: "DEBIT",
          amount: totalAmount,
          cashbackAmt: 0,
          balanceAfter: updatedUser.walletBalance,
          referenceId: created.id,
          description: `IRCTC E-Catering (${vendorName} at ${stationCode})`,
        },
      });

      return {
        order: {
          id: created.id,
          userId: created.userId,
          pnr: created.pnr,
          stationCode: created.stationCode,
          stationName: station?.stationName ?? stationCode,
          vendorName: created.vendorName,
          items,
          totalAmount: Number(created.totalAmount),
          deliveryCoach: created.deliveryCoach,
          deliveryBerth: created.deliveryBerth,
          status: created.status,
          createdAt: created.createdAt.toISOString(),
        },
        walletBalance: Number(updatedUser.walletBalance),
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "E-Catering order failed." },
      { status: 400 }
    );
  }
}
