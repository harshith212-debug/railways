"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  TrainFront,
  QrCode,
  FileText,
  Navigation,
  LayoutGrid,
  UtensilsCrossed,
  Wallet,
  Search,
  ShieldCheck,
  Database,
  Plus,
  LogIn,
} from "lucide-react";
import { UserDTO } from "@/lib/types";

export type ModuleKey =
  | "RESERVED"
  | "UTS"
  | "PNR"
  | "LIVE"
  | "COACHES"
  | "ECATERING";

interface HeaderProps {
  activeModule: ModuleKey;
  onSelectModule: (mod: ModuleKey) => void;
  user: UserDTO | null;
  dbMode: string;
  onOpenWallet: () => void;
  onQuickPnrSearch: (pnr: string) => void;
}

const MODULES: { key: ModuleKey; label: string; badge?: string; icon: React.ReactNode }[] = [
  { key: "RESERVED", label: "Book Tickets", badge: "IRCTC", icon: <TrainFront className="w-4 h-4" /> },
  { key: "UTS", label: "UTS & Platform QR", badge: "3% Off", icon: <QrCode className="w-4 h-4" /> },
  { key: "PNR", label: "PNR & E-Ticket", icon: <FileText className="w-4 h-4" /> },
  { key: "LIVE", label: "Live Train", badge: "NTES", icon: <Navigation className="w-4 h-4" /> },
  { key: "COACHES", label: "Coach & Seat Map", icon: <LayoutGrid className="w-4 h-4" /> },
  { key: "ECATERING", label: "Food & Rail Madad", badge: "139", icon: <UtensilsCrossed className="w-4 h-4" /> },
];

export default function Header({
  activeModule,
  onSelectModule,
  user,
  dbMode,
  onOpenWallet,
  onQuickPnrSearch,
}: HeaderProps) {
  const [quickPnr, setQuickPnr] = useState("");

  const handlePnrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickPnr.trim().length >= 6) {
      onQuickPnrSearch(quickPnr.trim());
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-[#071A33] via-[#0B2545] to-[#134074] text-white shadow-xl border-b border-white/10 no-print">
      {/* Primary Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3.5">
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-[#F97316] to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/25 ring-2 ring-white/15">
            <TrainFront className="w-6 h-6 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0B2545]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white to-sky-200 bg-clip-text text-transparent">
                Rail Yatra
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-amber-300 border border-amber-300/25">
                Super-App
              </span>
              <span
                className="hidden lg:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/25"
                title="Active persistence engine"
              >
                <Database className="w-3 h-3" />
                {dbMode === "POSTGRESQL" ? "PostgreSQL ACID" : "Instant Local Mode"}
              </span>
            </div>
            <p className="text-[11px] text-sky-200/80 font-medium">
              Indian Railways • Reserve, Track, Dine & Travel
            </p>
          </div>
        </div>

        {/* Quick PNR Lookup */}
        <form onSubmit={handlePnrSubmit} className="flex-1 max-w-sm hidden md:flex">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-sky-300/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              maxLength={10}
              value={quickPnr}
              onChange={(e) => setQuickPnr(e.target.value.replace(/\D/g, ""))}
              placeholder="Track PNR (e.g. 4218905632)"
              className="w-full pl-10 pr-20 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder:text-sky-200/60 font-mono-rail focus:outline-none focus:bg-white/15 focus:ring-2 focus:ring-[#F97316] transition"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-[#F97316] hover:bg-orange-500 text-[11px] font-bold transition shadow-sm"
            >
              Check
            </button>
          </div>
        </form>

        {/* User, Auth & R-Wallet */}
        <div className="flex items-center gap-2.5">
          {user && (
            <div className="hidden xl:flex items-center gap-2 text-xs text-sky-100 bg-white/10 border border-white/10 px-3 py-2 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div className="leading-tight">
                <div className="font-semibold">{user.fullName}</div>
                <div className="text-[10px] text-sky-300">@{user.irctcUsername}</div>
              </div>
            </div>
          )}

          <Link
            href="/login"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-sky-100 transition"
          >
            <LogIn className="w-3.5 h-3.5 text-[#F97316]" />
            <span>Sign In / Up</span>
          </Link>

          <button
            onClick={onOpenWallet}
            className="group flex items-center gap-2.5 bg-white/10 hover:bg-white/15 border border-white/20 px-3.5 py-2 rounded-xl transition shadow-sm"
          >
            <div className="w-7 h-7 rounded-lg bg-[#F97316]/20 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-[#F97316]" />
            </div>
            <div className="text-left">
              <div className="text-[10px] text-sky-200 uppercase tracking-wider leading-none">
                R-Wallet
              </div>
              <div className="text-sm font-bold font-mono-rail leading-tight mt-0.5">
                ₹{user ? user.walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
              </div>
            </div>
            <span className="ml-1 inline-flex items-center gap-0.5 text-[11px] bg-[#F97316] group-hover:bg-orange-500 text-white px-2 py-1 rounded-lg font-bold transition">
              <Plus className="w-3 h-3" /> Add
            </span>
          </button>
        </div>
      </div>

      {/* Modern Pill Navigation */}
      <div className="bg-[#071A33]/70 backdrop-blur-md border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1.5 overflow-x-auto py-2">
          {MODULES.map((m) => {
            const active = activeModule === m.key;
            return (
              <button
                key={m.key}
                onClick={() => onSelectModule(m.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? "bg-white text-[#0B2545] shadow-md scale-[1.01]"
                    : "text-sky-100/85 hover:text-white hover:bg-white/10"
                }`}
              >
                <span className={active ? "text-[#F97316]" : "text-sky-300"}>{m.icon}</span>
                <span>{m.label}</span>
                {m.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                      active
                        ? "bg-orange-100 text-[#F97316]"
                        : "bg-white/10 text-sky-200"
                    }`}
                  >
                    {m.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
