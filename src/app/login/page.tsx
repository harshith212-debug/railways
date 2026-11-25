"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrainFront, Lock, User, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("arjun_railone");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign in failed.");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071A33] via-[#0B2545] to-[#134074] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/10">
        <div className="bg-[#0B2545] text-white px-8 py-6 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#F97316] to-amber-500 flex items-center justify-center shadow-lg">
            <TrainFront className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Rail Yatra Sign In</h1>
            <p className="text-xs text-sky-200">Unified IRCTC & R-Wallet Account</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              IRCTC Username or Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="arjun_railone or email"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#134074]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#134074]"
              />
            </div>
          </div>

          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[11px] text-[#134074] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Demo Account:</strong> <span className="font-mono-rail">arjun_railone</span> /{" "}
              <span className="font-mono-rail">password123</span>
            </div>
          </div>

          {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition disabled:opacity-60"
          >
            {loading ? "Signing In..." : "Sign In to Rail Yatra"}
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="pt-2 text-center text-xs text-slate-500">
            New to Rail Yatra?{" "}
            <Link href="/signup" className="font-bold text-[#134074] hover:underline">
              Create an Account
            </Link>
          </div>
          <div className="text-center">
            <Link href="/" className="text-[11px] text-slate-400 hover:text-slate-600">
              ← Back to Dashboard
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
