import { NextRequest, NextResponse } from "next/server";
import { isPostgresAvailable, prisma } from "@/lib/prisma";
import { memoryStore } from "@/lib/memory-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = String(body.identifier || "").trim();
    const password = String(body.password || "");

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Username/Email and password are required." },
        { status: 400 }
      );
    }

    if (!(await isPostgresAvailable())) {
      const user = memoryStore.loginUser(identifier, password);
      const res = NextResponse.json({ user });
      res.cookies.set("railyatra_user", user.id, { path: "/", maxAge: 60 * 60 * 24 * 7 });
      return res;
    }

    const found = await prisma.user.findFirst({
      where: {
        OR: [{ irctcUsername: identifier }, { email: identifier }],
      },
    });
    if (!found) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const user = {
      id: found.id,
      irctcUsername: found.irctcUsername,
      fullName: found.fullName,
      email: found.email,
      phone: found.phone,
      aadhaarVerified: found.aadhaarVerified,
      walletBalance: Number(found.walletBalance),
    };
    const res = NextResponse.json({ user });
    res.cookies.set("railyatra_user", user.id, { path: "/", maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sign in failed." },
      { status: 401 }
    );
  }
}
