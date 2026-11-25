"use client";

import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  FileText,
  Printer,
  Search,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  X,
} from "lucide-react";
import { BookingDTO } from "@/lib/types";

interface PnrErsModuleProps {
  bookings: BookingDTO[];
  initialPnr?: string | null;
  onBookingUpdated: (booking: BookingDTO, newWalletBalance: number) => void;
}

export default function PnrErsModule({
  bookings,
  initialPnr,
  onBookingUpdated,
}: PnrErsModuleProps) {
  const [pnrInput, setPnrInput] = useState(initialPnr || bookings[0]?.pnr || "4218905632");
  const [activeBooking, setActiveBooking] = useState<BookingDTO | null>(
    bookings.find((b) => b.pnr === (initialPnr || bookings[0]?.pnr)) || bookings[0] || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [selectedPaxIds, setSelectedPaxIds] = useState<string[]>([]);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelResult, setCancelResult] = useState<{
    refundAmount: number;
    deductionAmount: number;
    promotedPnrs: string[];
  } | null>(null);

  useEffect(() => {
    if (initialPnr) {
      setPnrInput(initialPnr);
      const found = bookings.find((b) => b.pnr === initialPnr);
      if (found) setActiveBooking(found);
    }
  }, [initialPnr, bookings]);

  const handleLookup = async (targetPnr?: string) => {
    const query = (targetPnr || pnrInput).trim();
    if (!query) return;
    setError(null);
    setCancelResult(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/pnr/${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "PNR not found.");
      setActiveBooking(data.booking);
      setPnrInput(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setLoading(false);
    }
  };

  const openCancelModal = () => {
    if (!activeBooking) return;
    const activeIds = activeBooking.passengers
      .filter((p) => p.currentStatus !== "CAN")
      .map((p) => p.passengerId);
    setSelectedPaxIds(activeIds);
    setCancelModalOpen(true);
  };

  const togglePax = (id: string) => {
    setSelectedPaxIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirmCancel = async () => {
    if (!activeBooking || !selectedPaxIds.length) return;
    setCancelLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${activeBooking.pnr}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passengerIds: selectedPaxIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cancellation failed.");
      setActiveBooking(data.booking);
      setCancelResult({
        refundAmount: data.refundAmount,
        deductionAmount: data.deductionAmount,
        promotedPnrs: data.promotedPnrs || [],
      });
      onBookingUpdated(data.booking, data.walletBalance);
      setCancelModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancellation failed.");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Lookup Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 no-print">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
            className="flex items-center gap-2 flex-1 max-w-md"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                maxLength={10}
                value={pnrInput}
                onChange={(e) => setPnrInput(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 10-digit PNR"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-rail focus:outline-none focus:ring-2 focus:ring-[#134074]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white text-sm font-semibold transition"
            >
              {loading ? "Checking..." : "Get PNR Status"}
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 mr-1">Your PNRs:</span>
            {bookings.slice(0, 5).map((b) => (
              <button
                key={b.pnr}
                type="button"
                onClick={() => handleLookup(b.pnr)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono-rail font-semibold border transition ${
                  activeBooking?.pnr === b.pnr
                    ? "bg-[#134074] text-white border-[#134074]"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {b.pnr} ({b.bookingStatus === "CONFIRMED" ? "CNF" : b.bookingStatus})
              </button>
            ))}
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-600 font-semibold">{error}</p>}
      </div>

      {/* Cancellation Summary Banner */}
      {cancelResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 no-print">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
          <div className="text-xs text-emerald-900 space-y-1">
            <div className="font-bold text-sm">
              Cancellation Processed — ₹{cancelResult.refundAmount.toFixed(2)} credited to R-Wallet
            </div>
            <div>
              Indian Railways Cancellation Deduction: ₹{cancelResult.deductionAmount.toFixed(2)}.
              {cancelResult.promotedPnrs.length > 0 && (
                <span className="ml-1 font-semibold">
                  Auto-promoted RAC/WL PNR(s): {cancelResult.promotedPnrs.join(", ")}!
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Electronic Reservation Slip (ERS) */}
      {activeBooking && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print-only-ers">
          <div className="bg-[#0B2545] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-[#F97316]" />
              <div>
                <div className="text-xs uppercase tracking-wider text-sky-300 font-semibold">
                  Rail Yatra • IRCTC Electronic Reservation Slip (ERS)
                </div>
                <div className="text-lg font-bold font-mono-rail">
                  PNR: {activeBooking.pnr}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 no-print">
              <button
                type="button"
                onClick={() => setPdfPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white text-xs font-bold transition"
              >
                <FileDown className="w-4 h-4" /> View Ticket PDF
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#0B2545] hover:bg-slate-100 text-xs font-bold transition"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
              {activeBooking.bookingStatus !== "CANCELLED" && (
                <button
                  type="button"
                  onClick={openCancelModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition"
                >
                  <XCircle className="w-4 h-4" /> Cancel Ticket
                </button>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Train & Journey Header */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center border-b border-slate-200 pb-5">
              <div className="md:col-span-9 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="text-slate-400">Train No. & Name</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    <span className="font-mono-rail">{activeBooking.trainNumber}</span> /{" "}
                    {activeBooking.trainName}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Journey Date</div>
                  <div className="font-bold font-mono-rail text-slate-900 mt-0.5">
                    {activeBooking.journeyDate}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">From → To</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {activeBooking.fromStation} ({activeBooking.departureTime}) →{" "}
                    {activeBooking.toStation} ({activeBooking.arrivalTime})
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Class / Quota / Chart</div>
                  <div className="font-bold font-mono-rail text-slate-900 mt-0.5">
                    {activeBooking.displayClass} / {activeBooking.quota} •{" "}
                    {activeBooking.chartPrepared ? "Chart Prepared" : "Chart Not Prepared"}
                  </div>
                </div>
              </div>

              <div className="md:col-span-3 flex justify-end">
                <div className="p-2 border border-slate-200 rounded-xl bg-white">
                  <QRCodeSVG
                    value={`PNR:${activeBooking.pnr}|TRN:${activeBooking.trainNumber}|${activeBooking.fromStation}-${activeBooking.toStation}|DT:${activeBooking.journeyDate}`}
                    size={84}
                  />
                </div>
              </div>
            </div>

            {/* Passenger Status Table */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Passenger Details & Current Status
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">#</th>
                      <th className="py-2.5 px-4 font-semibold">Passenger Name</th>
                      <th className="py-2.5 px-4 font-semibold">Age / Gender</th>
                      <th className="py-2.5 px-4 font-semibold">Booking Status</th>
                      <th className="py-2.5 px-4 font-semibold">Current Status</th>
                      <th className="py-2.5 px-4 font-semibold">Coach / Berth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeBooking.passengers.map((p, i) => (
                      <tr key={p.passengerId}>
                        <td className="py-3 px-4 font-mono-rail">{i + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                        <td className="py-3 px-4 font-mono-rail">
                          {p.age} / {p.gender[0]}
                        </td>
                        <td className="py-3 px-4 font-mono-rail">
                          {p.bookingStatus}
                          {p.racOrWlNumber ? `/${p.racOrWlNumber}` : ""}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded font-mono-rail font-bold ${
                              p.currentStatus === "CNF"
                                ? "bg-emerald-100 text-emerald-800"
                                : p.currentStatus === "RAC"
                                ? "bg-amber-100 text-amber-800"
                                : p.currentStatus === "CAN"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {p.currentStatus}
                            {p.currentStatus !== "CNF" && p.currentStatus !== "CAN" && p.racOrWlNumber
                              ? `-${p.racOrWlNumber}`
                              : ""}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono-rail font-bold text-[#0B2545]">
                          {p.currentStatus === "CAN"
                            ? "—"
                            : p.allocatedCoach && p.allocatedBerth
                            ? `${p.allocatedCoach} / ${p.allocatedBerth} (${p.berthType})`
                            : "Waiting"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fare Summary */}
            <div className="bg-slate-50 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs border border-slate-200">
              <div className="space-x-4 text-slate-600">
                <span>
                  Payment Mode:{" "}
                  <strong className="text-slate-900">{activeBooking.paymentMode}</strong>
                </span>
                <span>
                  GST: <strong className="font-mono-rail">₹{activeBooking.gstAmount.toFixed(2)}</strong>
                </span>
                <span>
                  IRCTC Conv. Fee:{" "}
                  <strong className="font-mono-rail">₹{activeBooking.convenienceFee.toFixed(2)}</strong>
                </span>
              </div>
              <div className="text-sm font-bold font-mono-rail text-[#0B2545]">
                Total Fare Paid: ₹{activeBooking.totalFare.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* A4 PDF Ticket Viewer Modal */}
      {pdfPreviewOpen && activeBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-slate-100 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-300">
            <div className="bg-[#0B2545] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileDown className="w-4 h-4 text-[#F97316]" />
                <span className="text-sm font-bold font-mono-rail">
                  RailYatra_Ticket_{activeBooking.pnr}.pdf — A4 Preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPdfPreviewOpen(false);
                    setTimeout(() => window.print(), 150);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#F97316] hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Save as PDF / Print
                </button>
                <button
                  type="button"
                  onClick={() => setPdfPreviewOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex justify-center">
              <div className="bg-white w-full max-w-[680px] p-8 shadow-md border border-slate-300 text-slate-900 space-y-5">
                <div className="flex items-start justify-between border-b-2 border-[#0B2545] pb-4">
                  <div>
                    <div className="text-lg font-extrabold text-[#0B2545]">
                      RAIL YATRA — INDIAN RAILWAYS
                    </div>
                    <div className="text-xs text-slate-500 font-semibold">
                      Electronic Reservation Slip (Personal User)
                    </div>
                  </div>
                  <div className="text-right font-mono-rail">
                    <div className="text-xs text-slate-500">PNR NUMBER</div>
                    <div className="text-lg font-bold text-[#0B2545]">{activeBooking.pnr}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div>
                    <div className="text-slate-400">Train No / Name</div>
                    <div className="font-bold mt-0.5">
                      {activeBooking.trainNumber} / {activeBooking.trainName}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Boarding → Destination</div>
                    <div className="font-bold mt-0.5">
                      {activeBooking.fromStation} ({activeBooking.departureTime}) →{" "}
                      {activeBooking.toStation} ({activeBooking.arrivalTime})
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Date / Class / Quota</div>
                    <div className="font-bold font-mono-rail mt-0.5">
                      {activeBooking.journeyDate} • {activeBooking.displayClass} •{" "}
                      {activeBooking.quota}
                    </div>
                  </div>
                </div>

                <table className="w-full text-xs border border-slate-300">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2 text-left border-b border-slate-300">#</th>
                      <th className="p-2 text-left border-b border-slate-300">Name</th>
                      <th className="p-2 text-left border-b border-slate-300">Age/Sex</th>
                      <th className="p-2 text-left border-b border-slate-300">Status</th>
                      <th className="p-2 text-left border-b border-slate-300">Coach / Berth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeBooking.passengers.map((p, idx) => (
                      <tr key={p.passengerId} className="border-b border-slate-200">
                        <td className="p-2 font-mono-rail">{idx + 1}</td>
                        <td className="p-2 font-bold">{p.name}</td>
                        <td className="p-2 font-mono-rail">
                          {p.age}/{p.gender[0]}
                        </td>
                        <td className="p-2 font-mono-rail font-bold">{p.currentStatus}</td>
                        <td className="p-2 font-mono-rail">
                          {p.allocatedCoach && p.allocatedBerth
                            ? `${p.allocatedCoach} / ${p.allocatedBerth} (${p.berthType})`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div className="text-xs space-y-1 text-slate-600">
                    <div>
                      Payment Mode: <strong>{activeBooking.paymentMode}</strong>
                    </div>
                    <div>
                      GST: ₹{activeBooking.gstAmount.toFixed(2)} • Conv. Fee: ₹
                      {activeBooking.convenienceFee.toFixed(2)}
                    </div>
                    <div className="text-sm font-bold text-[#0B2545] font-mono-rail">
                      Total Fare: ₹{activeBooking.totalFare.toFixed(2)}
                    </div>
                  </div>
                  <QRCodeSVG
                    value={`RAILYATRA|PNR:${activeBooking.pnr}|TRN:${activeBooking.trainNumber}|${activeBooking.fromStation}-${activeBooking.toStation}`}
                    size={84}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModalOpen && activeBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-red-600 text-white px-5 py-4 flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base">Cancel Passengers — PNR {activeBooking.pnr}</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                Select passengers to cancel. Standard Indian Railways cancellation charges apply and
                net refund is credited immediately to your R-Wallet.
              </p>
              <div className="space-y-2">
                {activeBooking.passengers
                  .filter((p) => p.currentStatus !== "CAN")
                  .map((p) => (
                    <label
                      key={p.passengerId}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={selectedPaxIds.includes(p.passengerId)}
                          onChange={() => togglePax(p.passengerId)}
                          className="rounded text-red-600"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono-rail">
                            {p.currentStatus}{" "}
                            {p.allocatedCoach ? `• ${p.allocatedCoach}/${p.allocatedBerth}` : ""}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Keep Ticket
                </button>
                <button
                  type="button"
                  disabled={cancelLoading || !selectedPaxIds.length}
                  onClick={handleConfirmCancel}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {cancelLoading ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
