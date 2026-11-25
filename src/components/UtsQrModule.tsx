"use client";

import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Timer, Sparkles, CheckCircle2, Ticket } from "lucide-react";
import { StationDTO, UtsCategoryCode, UtsTicketDTO } from "@/lib/types";

interface UtsQrModuleProps {
  stations: StationDTO[];
  utsTickets: UtsTicketDTO[];
  onUtsBooked: (ticket: UtsTicketDTO, newWalletBalance: number) => void;
}

function CountdownBadge({ validUntil }: { validUntil: string }) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, new Date(validUntil).getTime() - Date.now())
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemainingMs(Math.max(0, new Date(validUntil).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [validUntil]);

  if (remainingMs <= 0) {
    return (
      <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold font-mono-rail">
        EXPIRED
      </span>
    );
  }

  const totalSec = Math.floor(remainingMs / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-mono-rail">
      <Timer className="w-3.5 h-3.5 animate-pulse" />
      {hrs > 0 ? `${String(hrs).padStart(2, "0")}:` : ""}
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </span>
  );
}

export default function UtsQrModule({
  stations,
  utsTickets,
  onUtsBooked,
}: UtsQrModuleProps) {
  const [category, setCategory] = useState<UtsCategoryCode>("PLATFORM_TICKET");
  const [sourceStation, setSourceStation] = useState("SC");
  const [destStation, setDestStation] = useState("BZA");
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleBookUts = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/uts/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketCategory: category,
          sourceStation,
          destStation: category === "PLATFORM_TICKET" ? null : destStation,
          adultCount,
          childCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "UTS booking failed.");
      onUtsBooked(data.ticket, data.walletBalance);
      setSuccessMsg(`Paperless UTS Pass ${data.ticket.utsNumber} issued!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "UTS booking failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Booking Form */}
      <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4 h-fit">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0B2545] flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#F97316]" /> UTS Paperless Ticket
            </h2>
            <p className="text-xs text-slate-500">
              Instant QR pass • 3% R-Wallet Discount applied automatically
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-100 text-[#F97316]">
            <Sparkles className="w-3 h-3" /> 3% OFF
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          {(
            [
              { key: "PLATFORM_TICKET", label: "Platform Ticket (₹10)" },
              { key: "UNRESERVED_JOURNEY", label: "Unreserved Journey" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategory(tab.key)}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition ${
                category === tab.key
                  ? "bg-[#0B2545] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleBookUts} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {category === "PLATFORM_TICKET" ? "Station" : "From Station"}
            </label>
            <select
              value={sourceStation}
              onChange={(e) => setSourceStation(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#134074]"
            >
              {stations.map((s) => (
                <option key={s.stationCode} value={s.stationCode}>
                  {s.stationCode} — {s.stationName}
                </option>
              ))}
            </select>
          </div>

          {category !== "PLATFORM_TICKET" && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Destination Station
              </label>
              <select
                value={destStation}
                onChange={(e) => setDestStation(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#134074]"
              >
                {stations.map((s) => (
                  <option key={s.stationCode} value={s.stationCode}>
                    {s.stationCode} — {s.stationName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Adults</label>
              <select
                value={adultCount}
                onChange={(e) => setAdultCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono-rail"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} Adult{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>
            {category !== "PLATFORM_TICKET" && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Children</label>
                <select
                  value={childCount}
                  onChange={(e) => setChildCount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono-rail"
                >
                  {[0, 1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n} Child{n !== 1 ? "ren" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
          {successMsg && (
            <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white font-bold text-sm shadow-sm transition disabled:opacity-60"
          >
            {loading
              ? "Signing QR Pass..."
              : category === "PLATFORM_TICKET"
              ? `Pay ₹${(adultCount * 10 * 0.97).toFixed(2)} via R-Wallet (3% Off)`
              : "Issue Unreserved QR Ticket (3% Off)"}
          </button>
        </form>
      </div>

      {/* Active UTS Passes */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#0B2545] flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#134074]" /> Active Paperless QR Passes (
            {utsTickets.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {utsTickets.map((t) => {
            const qrData = JSON.stringify({
              uts: t.utsNumber,
              cat: t.ticketCategory,
              src: t.sourceStation,
              dst: t.destStation,
              pax: `${t.adultCount}A/${t.childCount}C`,
              exp: t.validUntil,
              sig: t.qrSignatureHash,
            });

            return (
              <div
                key={t.utsNumber}
                className="bg-white rounded-2xl shadow-sm border-2 border-[#134074]/20 overflow-hidden"
              >
                <div className="bg-[#0B2545] text-white px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-sky-300 font-semibold">
                      {t.ticketCategory.replace("_", " ")}
                    </div>
                    <div className="font-mono-rail font-bold text-sm">{t.utsNumber}</div>
                  </div>
                  <CountdownBadge validUntil={t.validUntil} />
                </div>

                <div className="p-4 flex items-center gap-4">
                  <div className="p-2 bg-white border border-slate-200 rounded-xl shrink-0">
                    <QRCodeSVG value={qrData} size={108} level="M" />
                  </div>
                  <div className="space-y-1.5 text-xs min-w-0">
                    <div>
                      <span className="text-slate-400">Station:</span>{" "}
                      <span className="font-bold text-slate-900">
                        {t.sourceStation}
                        {t.destStation ? ` → ${t.destStation}` : ""}
                      </span>
                    </div>
                    <div className="text-slate-600 truncate">
                      {t.sourceStationName}
                      {t.destStationName ? ` to ${t.destStationName}` : ""}
                    </div>
                    <div>
                      <span className="text-slate-400">Passengers:</span>{" "}
                      <span className="font-mono-rail font-semibold">
                        {t.adultCount} Adult{t.adultCount > 1 ? "s" : ""}
                        {t.childCount > 0 ? `, ${t.childCount} Child` : ""}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Paid:</span>{" "}
                      <span className="font-mono-rail font-bold text-emerald-700">
                        ₹{t.farePaid.toFixed(2)}
                      </span>{" "}
                      <span className="text-[10px] text-emerald-600">
                        (Saved ₹{t.discountApplied.toFixed(2)})
                      </span>
                    </div>
                    <div className="text-[10px] font-mono-rail text-slate-400 truncate">
                      SIG: {t.qrSignatureHash}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
