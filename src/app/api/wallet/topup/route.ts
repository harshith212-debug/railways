import { NextRequest, NextResponse } from "next/server";
import { isPostgresAvailable, prisma } from "@/lib/prisma";
import { memoryStore } from "@/lib/memory-store";
import { SEED_USER } from "@/lib/seed-data";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const amount = Number(body.amount);
    const method = String(body.method || "BHIM UPI");

    if (!Number.isFinite(amount) || amount <= 0 || amount > 50000) {
      return NextResponse.json(
        { error: "Top-up amount must be between ₹1 and ₹50,000." },
        { status: 400 }
      );
    }

    if (!(await isPostgresAvailable())) {
      const result = memoryStore.topUpWallet(amount, method);
      return NextResponse.json(result);
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: SEED_USER.id },
        data: { walletBalance: { increment: amount } },
      });

      const txn = await tx.walletTransaction.create({
        data: {
          userId: SEED_USER.id,
          txnType: "CREDIT",
          amount,
          cashbackAmt: 0,
          balanceAfter: updatedUser.walletBalance,
          referenceId: `${method.toUpperCase()}-${Math.floor(100000 + Math.random() * 899999)}`,
          description: `R-Wallet Recharge via ${method}`,
        },
      });

      return {
        user: {
          ...updatedUser,
          walletBalance: Number(updatedUser.walletBalance),
        },
        transaction: {
          ...txn,
          amount: Number(txn.amount),
          cashbackAmt: Number(txn.cashbackAmt),
          balanceAfter: Number(txn.balanceAfter),
          createdAt: txn.createdAt.toISOString(),
        },
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Wallet top-up failed." },
      { status: 400 }
    );
  }
}
