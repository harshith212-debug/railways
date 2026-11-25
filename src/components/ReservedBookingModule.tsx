"use client";

import React, { useState } from "react";
import {
  ArrowLeftRight,
  Calendar,
  Search,
  Train,
  Utensils,
  UserPlus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  BerthTypeCode,
  BookingDTO,
  CoachClassCode,
  GenderCode,
  MasterPassengerDTO,
  QuotaCode,
  SeatAvailabilityDTO,
  StationDTO,
  TrainSearchResultDTO,
} from "@/lib/types";
import { CLASS_FULL_NAME, isAcClass } from "@/lib/railway-logic";

interface ReservedBookingModuleProps {
  stations: StationDTO[];
  masterPassengers: MasterPassengerDTO[];
  walletBalance: number;
  onBookingCreated: (booking: BookingDTO, newWalletBalance: number) => void;
  onViewPnr: (pnr: string) => void;
}

interface PassengerDraft {
  name: string;
  age: string;
  gender: GenderCode;
  berthPreference: BerthTypeCode | "";
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function ReservedBookingModule({
  stations,
  masterPassengers,
  walletBalance,
  onBookingCreated,
  onViewPnr,
}: ReservedBookingModuleProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [from, setFrom] = useState("SC");
  const [to, setTo] = useState("NDLS");
  const [date, setDate] = useState(todayStr);
  const [quota, setQuota] = useState<QuotaCode>("GN");

  const [results, setResults] = useState<TrainSearchResultDTO[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedTrain, setSelectedTrain] = useState<TrainSearchResultDTO | null>(null);
  const [selectedAvail, setSelectedAvail] = useState<SeatAvailabilityDTO | null>(null);

  const [passengers, setPassengers] = useState<PassengerDraft[]>([
    { name: "Arjun Sharma", age: "29", gender: "MALE", berthPreference: "LB" },
  ]);
  const [paymentMode, setPaymentMode] = useState<
    "R_WALLET" | "UPI" | "CARD" | "NETBANKING" | "PAY_LATER"
  >("R_WALLET");
  const [upiId, setUpiId] = useState("arjun@okicici");
  const [selectedBank, setSelectedBank] = useState("SBI");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingDTO | null>(null);

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchError(null);
    setSelectedTrain(null);
    setSelectedAvail(null);
    setConfirmedBooking(null);
    setSearching(true);

    try {
      const res = await fetch(
        `/api/trains/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}&quota=${encodeURIComponent(quota)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.trains || []);
      setSearchedOnce(true);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Failed to search trains.");
    } finally {
      setSearching(false);
    }
  };

  const addMasterPassenger = (mp: MasterPassengerDTO) => {
    if (passengers.length >= 6) return;
    if (passengers.some((p) => p.name.toLowerCase() === mp.fullName.toLowerCase())) return;
    setPassengers((prev) => [
      ...prev,
      {
        name: mp.fullName,
        age: String(mp.age),
        gender: mp.gender,
        berthPreference: mp.berthPreference || "",
      },
    ]);
  };

  const addEmptyPassenger = () => {
    if (passengers.length >= 6) return;
    setPassengers((prev) => [
      ...prev,
      { name: "", age: "", gender: "MALE", berthPreference: "" },
    ]);
  };

  const removePassenger = (idx: number) => {
    if (passengers.length <= 1) return;
    setPassengers((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePassenger = (idx: number, field: keyof PassengerDraft, value: string) => {
    setPassengers((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  };

  const handleBookNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrain || !selectedAvail) return;
    setBookingError(null);

    const validPax = passengers.map((p) => ({
      name: p.name.trim(),
      age: Number(p.age),
      gender: p.gender,
      berthPreference: p.berthPreference || null,
    }));

    if (validPax.some((p) => !p.name || !p.age || p.age < 1 || p.age > 125)) {
      setBookingError("Please enter valid name and age (1–125) for all passengers.");
      return;
    }

    setBookingLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: selectedTrain.scheduleId,
          fromStation: selectedTrain.fromStation,
          toStation: selectedTrain.toStation,
          boardingStation: selectedTrain.fromStation,
          coachClass: selectedAvail.coachClass,
          quota,
          paymentMode,
          passengers: validPax,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed.");
      setConfirmedBooking(data.booking);
      onBookingCreated(data.booking, data.walletBalance);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Booking failed.");
    } finally {
      setBookingLoading(false);
    }
  };

  // Fare breakdown preview
  const paxCount = passengers.length;
  const baseTotal = selectedAvail ? selectedAvail.baseFare * paxCount : 0;
  const gstPerPax =
    selectedAvail && isAcClass(selectedAvail.coachClass)
      ? Math.round(selectedAvail.baseFare * 0.05)
      : 0;
  const gstTotal = gstPerPax * paxCount;
  const convFee =
    selectedAvail && isAcClass(selectedAvail.coachClass) ? 35.4 : selectedAvail ? 17.7 : 0;
  const grandTotal = baseTotal + gstTotal + convFee;

  return (
    <div className="space-y-6">
      {/* Search Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#0B2545]">
              Book Reserved Train Tickets (IRCTC)
            </h2>
            <p className="text-xs text-slate-500">
              Real-time segment availability, Tatkal (+30%) & automatic consecutive berth allocation
            </p>
          </div>
          <div className="flex gap-1.5 text-[11px]">
            {(
              [
                { from: "SC", to: "NDLS", label: "SC → NDLS" },
                { from: "SC", to: "VSKP", label: "SC → VSKP (Vande Bharat)" },
                { from: "MAS", to: "NDLS", label: "MAS → NDLS" },
                { from: "CSMT", to: "NDLS", label: "CSMT → NDLS" },
              ] as const
            ).map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setFrom(preset.from);
                  setTo(preset.to);
                }}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1">From Station</label>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#134074]"
            >
              {stations.map((s) => (
                <option key={s.stationCode} value={s.stationCode}>
                  {s.stationCode} — {s.stationName}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1 flex justify-center">
            <button
              type="button"
              onClick={handleSwap}
              title="Swap Stations"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-[#134074] hover:text-white text-[#134074] transition border border-slate-200"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1">To Station</label>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#134074]"
            >
              {stations.map((s) => (
                <option key={s.stationCode} value={s.stationCode}>
                  {s.stationCode} — {s.stationName}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Journey Date</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={date}
                min={todayStr}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-rail focus:outline-none focus:ring-2 focus:ring-[#134074]"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Quota</label>
            <select
              value={quota}
              onChange={(e) => setQuota(e.target.value as QuotaCode)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#134074]"
            >
              <option value="GN">GENERAL (GN)</option>
              <option value="TQ">TATKAL (TQ +30%)</option>
              <option value="LD">LADIES (LD)</option>
              <option value="SS">SENIOR CITIZEN (SS)</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <button
              type="submit"
              disabled={searching}
              className="w-full py-2.5 px-4 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white font-semibold text-sm flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-60"
            >
              <Search className="w-4 h-4" />
              <span className="md:hidden">Search Trains</span>
            </button>
          </div>
        </form>

        {searchError && (
          <p className="mt-3 text-xs text-red-600 font-medium">{searchError}</p>
        )}
      </div>

      {/* Confirmation Banner */}
      {confirmedBooking && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5" />
            <div>
              <h3 className="font-bold text-emerald-900 text-base">
                Ticket Booked Successfully! PNR:{" "}
                <span className="font-mono-rail underline">{confirmedBooking.pnr}</span>
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                {confirmedBooking.trainNumber} {confirmedBooking.trainName} •{" "}
                {confirmedBooking.fromStation} → {confirmedBooking.toStation} •{" "}
                {confirmedBooking.passengers
                  .map(
                    (p) =>
                      `${p.name} (${p.currentStatus}${
                        p.allocatedCoach ? `/${p.allocatedCoach}-${p.allocatedBerth} ${p.berthType}` : ""
                      })`
                  )
                  .join(", ")}
              </p>
            </div>
          </div>
          <button
            onClick={() => onViewPnr(confirmedBooking.pnr)}
            className="px-4 py-2 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white text-xs font-semibold transition"
          >
            View E-Ticket (ERS) & Print
          </button>
        </div>
      )}

      {/* Search Results */}
      {searchedOnce && results.length === 0 && !searching && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
          No direct trains found between <span className="font-bold">{from}</span> and{" "}
          <span className="font-bold">{to}</span>. Try one of the quick route presets above.
        </div>
      )}

      <div className="space-y-4">
        {results.map((train) => {
          const hrs = Math.floor(train.durationMinutes / 60);
          const mins = train.durationMinutes % 60;
          const isSelectedTrain = selectedTrain?.scheduleId === train.scheduleId;

          return (
            <div
              key={train.scheduleId}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="px-2.5 py-1 rounded-lg bg-[#0B2545] text-white font-mono-rail text-sm font-bold">
                      {train.trainNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{train.trainName}</h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-[#134074] border border-sky-200">
                          {train.trainType.replace("_", " ")}
                        </span>
                        {train.hasPantry && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            <Utensils className="w-3 h-3" /> Pantry
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[11px] text-slate-500 mr-1">Runs on:</span>
                        {DAY_LABELS.map((d, idx) => {
                          const runs = train.runningDays[idx] === "1";
                          return (
                            <span
                              key={idx}
                              className={`text-[10px] w-4 h-4 rounded flex items-center justify-center font-bold ${
                                runs
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {d}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <div className="text-lg font-bold font-mono-rail text-slate-900">
                        {train.departureTime}
                      </div>
                      <div className="text-xs font-semibold text-slate-600">{train.fromStation}</div>
                    </div>
                    <div className="flex flex-col items-center px-2">
                      <span className="text-[11px] text-slate-500 font-mono-rail flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {hrs}h {mins}m
                      </span>
                      <div className="w-20 h-[2px] bg-slate-300 my-1 relative">
                        <div className="w-2 h-2 rounded-full bg-[#F97316] absolute -top-[3px] left-1/2 -translate-x-1/2" />
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono-rail">
                        {train.distanceKm} km
                      </span>
                    </div>
                    <div>
                      <div className="text-lg font-bold font-mono-rail text-slate-900">
                        {train.arrivalTime}
                        {train.dayDiff > 0 && (
                          <span className="text-[11px] text-[#F97316] ml-1">+{train.dayDiff}d</span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-slate-600">{train.toStation}</div>
                    </div>
                  </div>
                </div>

                {/* Class Cards */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {train.availabilities.map((av) => {
                    const isSelected = isSelectedTrain && selectedAvail?.id === av.id;
                    const isAvail = av.availableSeats > 0;
                    const isRac = !isAvail && av.racCount > 0;

                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          setSelectedTrain(train);
                          setSelectedAvail(av);
                          setConfirmedBooking(null);
                          setBookingError(null);
                        }}
                        className={`text-left p-3 rounded-xl border transition ${
                          isSelected
                            ? "border-[#F97316] bg-orange-50/70 ring-2 ring-[#F97316]/30"
                            : "border-slate-200 hover:border-[#134074] bg-slate-50/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[#0B2545] font-mono-rail">
                            {av.displayClass}
                          </span>
                          <span className="font-bold text-sm text-slate-900 font-mono-rail">
                            ₹{av.totalFareWithTax}
                          </span>
                        </div>
                        <div
                          className={`mt-1.5 text-xs font-bold font-mono-rail ${
                            isAvail
                              ? "text-emerald-700"
                              : isRac
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {av.statusLabel}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {CLASS_FULL_NAME[av.coachClass as CoachClassCode]}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Passenger Checkout Drawer */}
              {isSelectedTrain && selectedAvail && (
                <form
                  onSubmit={handleBookNow}
                  className="bg-slate-50 border-t border-slate-200 p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Train className="w-4 h-4 text-[#134074]" />
                      <h4 className="font-bold text-sm text-[#0B2545]">
                        Passenger Details — {selectedAvail.displayClass} ({quota})
                      </h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#F97316]" /> Quick-fill Master List:
                      </span>
                      {masterPassengers.map((mp) => (
                        <button
                          key={mp.id}
                          type="button"
                          onClick={() => addMasterPassenger(mp)}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-300 hover:border-[#134074] text-slate-700 font-medium transition"
                        >
                          + {mp.fullName} ({mp.age})
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {passengers.map((pax, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-white p-3 rounded-xl border border-slate-200"
                      >
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            required
                            placeholder="Passenger Full Name"
                            value={pax.name}
                            onChange={(e) => updatePassenger(idx, "name", e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#134074]"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            required
                            min={1}
                            max={125}
                            placeholder="Age"
                            value={pax.age}
                            onChange={(e) => updatePassenger(idx, "age", e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono-rail focus:outline-none focus:ring-2 focus:ring-[#134074]"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <select
                            value={pax.gender}
                            onChange={(e) => updatePassenger(idx, "gender", e.target.value)}
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#134074]"
                          >
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="TRANSGENDER">Transgender</option>
                          </select>
                        </div>
                        <div className="sm:col-span-3">
                          <select
                            value={pax.berthPreference}
                            onChange={(e) => updatePassenger(idx, "berthPreference", e.target.value)}
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#134074]"
                          >
                            <option value="">No Berth Preference</option>
                            <option value="LB">Lower Berth (LB)</option>
                            <option value="MB">Middle Berth (MB)</option>
                            <option value="UB">Upper Berth (UB)</option>
                            <option value="SL">Side Lower (SL)</option>
                            <option value="SU">Side Upper (SU)</option>
                            <option value="WS">Window Seat (WS)</option>
                          </select>
                        </div>
                        <div className="sm:col-span-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => removePassenger(idx)}
                            disabled={passengers.length <= 1}
                            className="p-2 text-slate-400 hover:text-red-600 disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <button
                      type="button"
                      onClick={addEmptyPassenger}
                      disabled={passengers.length >= 6}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#134074] hover:underline disabled:opacity-40"
                    >
                      <UserPlus className="w-4 h-4" /> Add Passenger (Max 6)
                    </button>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-right text-xs space-y-0.5">
                        <div className="text-slate-600">
                          Ticket Fare ({paxCount} × ₹{selectedAvail.baseFare}) + GST (₹{gstTotal}) + Conv. Fee (₹{convFee.toFixed(2)})
                        </div>
                        <div className="text-base font-bold font-mono-rail text-[#0B2545]">
                          Total Payable: ₹{grandTotal.toFixed(2)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={paymentMode}
                          onChange={(e) =>
                            setPaymentMode(
                              e.target.value as "R_WALLET" | "UPI" | "CARD" | "NETBANKING" | "PAY_LATER"
                            )
                          }
                          className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
                        >
                          <option value="R_WALLET">
                            R-Wallet (Bal: ₹{walletBalance.toFixed(0)})
                          </option>
                          <option value="UPI">BHIM UPI / GPay / PhonePe</option>
                          <option value="CARD">Credit / Debit / RuPay Card</option>
                          <option value="NETBANKING">NetBanking (SBI / HDFC / ICICI)</option>
                          <option value="PAY_LATER">IRCTC iPay (Pay Later)</option>
                        </select>

                        {paymentMode === "UPI" && (
                          <input
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="yourname@upi"
                            className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono-rail w-36"
                          />
                        )}

                        {paymentMode === "NETBANKING" && (
                          <select
                            value={selectedBank}
                            onChange={(e) => setSelectedBank(e.target.value)}
                            className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
                          >
                            <option value="SBI">State Bank of India</option>
                            <option value="HDFC">HDFC Bank</option>
                            <option value="ICICI">ICICI Bank</option>
                            <option value="AXIS">Axis Bank</option>
                          </select>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={bookingLoading}
                        className="px-5 py-2.5 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white font-bold text-sm shadow-sm transition disabled:opacity-60"
                      >
                        {bookingLoading ? "Allocating Berths..." : "Pay & Book Ticket"}
                      </button>
                    </div>
                  </div>
                  {bookingError && (
                    <p className="text-xs text-red-600 font-semibold">{bookingError}</p>
                  )}
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
