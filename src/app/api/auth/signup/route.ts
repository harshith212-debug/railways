import { NextRequest, NextResponse } from "next/server";
import { isPostgresAvailable, prisma } from "@/lib/prisma";
import { memoryStore } from "@/lib/memory-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fullName = String(body.fullName || "").trim();
    const irctcUsername = String(body.irctcUsername || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    if (!fullName || !irctcUsername || !email || !phone || password.length < 6) {
      return NextResponse.json(
        { error: "All fields are required and password must be at least 6 characters." },
        { status: 400 }
      );
    }

    if (!(await isPostgresAvailable())) {
      const user = memoryStore.registerUser({
        fullName,
        irctcUsername,
        email,
        phone,
        password,
      });
      const res = NextResponse.json({ user });
      res.cookies.set("railyatra_user", user.id, { path: "/", maxAge: 60 * 60 * 24 * 7 });
      return res;
    }

    const created = await prisma.user.create({
      data: {
        fullName,
        irctcUsername,
        email,
        phone,
        passwordHash: password,
        mpinHash: "1234",
        aadhaarVerified: true,
        walletBalance: 1000.0,
      },
    });

    const user = {
      id: created.id,
      irctcUsername: created.irctcUsername,
      fullName: created.fullName,
      email: created.email,
      phone: created.phone,
      aadhaarVerified: created.aadhaarVerified,
      walletBalance: Number(created.walletBalance),
    };
    const res = NextResponse.json({ user });
    res.cookies.set("railyatra_user", user.id, { path: "/", maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sign up failed." },
      { status: 400 }
    );
  }
}
