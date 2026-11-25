"use client";

import React, { useState } from "react";
import { UtensilsCrossed, ShieldAlert, CheckCircle2, Plus, Minus } from "lucide-react";
import {
  BookingDTO,
  ComplaintCategoryCode,
  EcateringOrderDTO,
  RailMadadComplaintDTO,
  StationDTO,
  TrainDTO,
} from "@/lib/types";

interface EcateringMadadModuleProps {
  bookings: BookingDTO[];
  stations: StationDTO[];
  trains: TrainDTO[];
  orders: EcateringOrderDTO[];
  complaints: RailMadadComplaintDTO[];
  onOrderCreated: (order: EcateringOrderDTO, newWalletBalance: number) => void;
  onComplaintCreated: (complaint: RailMadadComplaintDTO) => void;
}

const MENU_ITEMS = [
  { name: "Veg Deluxe Railway Thali", price: 220, vendor: "Comesum Food Plaza" },
  { name: "Hyderabadi Dum Biryani", price: 280, vendor: "Paradise IRCTC Express" },
  { name: "Masala Dosa & Filter Coffee", price: 145, vendor: "Bikanervala Express" },
  { name: "Paneer Butter Naan Combo", price: 195, vendor: "Haldiram's Trackside" },
  { name: "Rail Neer Packaged Water (1L)", price: 15, vendor: "IRCTC Pantry" },
];

export default function EcateringMadadModule({
  bookings,
  stations,
  trains,
  orders,
  complaints,
  onOrderCreated,
  onComplaintCreated,
}: EcateringMadadModuleProps) {
  // E-Catering state
  const [selectedPnr, setSelectedPnr] = useState(bookings[0]?.pnr || "");
  const [deliveryStation, setDeliveryStation] = useState("NGP");
  const [cart, setCart] = useState<Record<string, number>>({
    "Veg Deluxe Railway Thali": 1,
  });
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Rail Madad state
  const [rmPnr, setRmPnr] = useState(bookings[0]?.pnr || "");
  const [rmTrain, setRmTrain] = useState(trains[0]?.trainNumber || "12723");
  const [rmCategory, setRmCategory] = useState<ComplaintCategoryCode>("COACH_CLEANLINESS");
  const [rmCoach, setRmCoach] = useState("B1");
  const [rmDesc, setRmDesc] = useState("");
  const [rmLoading, setRmLoading] = useState(false);
  const [rmError, setRmError] = useState<string | null>(null);

  const updateQty = (name: string, delta: number) => {
    setCart((prev) => {
      const next = Math.max(0, (prev[name] || 0) + delta);
      return { ...prev, [name]: next };
    });
  };

  const cartItems = MENU_ITEMS.filter((m) => (cart[m.name] || 0) > 0).map((m) => ({
    name: m.name,
    qty: cart[m.name],
    price: m.price,
  }));
  const cartTotal = cartItems.reduce((sum, i) => sum + i.qty * i.price, 0);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError(null);
    setOrderSuccess(null);
    if (!selectedPnr) {
      setOrderError("Select a valid PNR first.");
      return;
    }
    if (!cartItems.length) {
      setOrderError("Add at least one food item.");
      return;
    }

    setOrderLoading(true);
    try {
      const res = await fetch("/api/ecatering", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pnr: selectedPnr,
          stationCode: deliveryStation,
          vendorName: "IRCTC E-Catering Partner",
          items: cartItems,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order failed.");
      onOrderCreated(data.order, data.walletBalance);
      setOrderSuccess(
        `Order ${data.order.id} confirmed! Delivering to Coach ${data.order.deliveryCoach}, Berth ${data.order.deliveryBerth} at ${data.order.stationCode}.`
      );
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : "Order failed.");
    } finally {
      setOrderLoading(false);
    }
  };

  const handleFileComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setRmError(null);
    if (!rmDesc.trim()) {
      setRmError("Please describe the issue.");
      return;
    }
    setRmLoading(true);
    try {
      const res = await fetch("/api/rail-madad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pnr: rmPnr || null,
          trainNumber: rmTrain,
          category: rmCategory,
          coachNumber: rmCoach,
          description: rmDesc.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to file complaint.");
      onComplaintCreated(data.complaint);
      setRmDesc("");
    } catch (err) {
      setRmError(err instanceof Error ? err.message : "Failed to file complaint.");
    } finally {
      setRmLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* IRCTC E-Catering */}
      <div className="lg:col-span-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#0B2545] flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-[#F97316]" /> IRCTC E-Catering
              </h2>
              <p className="text-xs text-slate-500">
                Hot meals delivered directly to your booked berth at upcoming stations
              </p>
            </div>
          </div>

          <form onSubmit={handlePlaceOrder} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Select Active PNR
                </label>
                <select
                  value={selectedPnr}
                  onChange={(e) => setSelectedPnr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono-rail"
                >
                  {bookings.map((b) => (
                    <option key={b.pnr} value={b.pnr}>
                      {b.pnr} ({b.trainNumber} • {b.fromStation}→{b.toStation})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Delivery Station
                </label>
                <select
                  value={deliveryStation}
                  onChange={(e) => setDeliveryStation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium"
                >
                  {stations.map((s) => (
                    <option key={s.stationCode} value={s.stationCode}>
                      {s.stationCode} — {s.stationName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              {MENU_ITEMS.map((item) => {
                const qty = cart[item.name] || 0;
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {item.vendor} •{" "}
                        <span className="font-mono-rail font-semibold text-slate-800">
                          ₹{item.price}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQty(item.name, -1)}
                        className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-mono-rail font-bold">{qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.name, 1)}
                        className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {orderError && <p className="text-xs text-red-600 font-semibold">{orderError}</p>}
            {orderSuccess && (
              <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {orderSuccess}
              </p>
            )}

            <button
              type="submit"
              disabled={orderLoading || cartTotal <= 0}
              className="w-full py-2.5 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white font-bold text-sm transition disabled:opacity-50"
            >
              {orderLoading
                ? "Placing Order..."
                : `Pay ₹${cartTotal.toFixed(2)} via R-Wallet & Order`}
            </button>
          </form>
        </div>

        {orders.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Recent E-Catering Orders ({orders.length})
            </h3>
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    PNR {ord.pnr} • Coach {ord.deliveryCoach}, Berth {ord.deliveryBerth}
                  </div>
                  <div className="text-slate-500">
                    At {ord.stationCode} • {ord.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                  </div>
                </div>
                <div className="text-right font-mono-rail">
                  <div className="font-bold text-slate-900">₹{ord.totalAmount.toFixed(2)}</div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                    {ord.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rail Madad 139 */}
      <div className="lg:col-span-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#0B2545] flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" /> Rail Madad (Helpline 139)
            </h2>
            <p className="text-xs text-slate-500">
              Instant onboard grievance redressal linked to your PNR & Train Superintendent
            </p>
          </div>

          <form onSubmit={handleFileComplaint} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Train</label>
                <select
                  value={rmTrain}
                  onChange={(e) => setRmTrain(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  {trains.map((t) => (
                    <option key={t.trainNumber} value={t.trainNumber}>
                      {t.trainNumber} — {t.trainName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  PNR (Optional)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={rmPnr}
                  onChange={(e) => setRmPnr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono-rail"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Coach</label>
                <input
                  type="text"
                  maxLength={5}
                  value={rmCoach}
                  onChange={(e) => setRmCoach(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono-rail"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Complaint Category
              </label>
              <select
                value={rmCategory}
                onChange={(e) => setRmCategory(e.target.value as ComplaintCategoryCode)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
              >
                <option value="COACH_CLEANLINESS">Coach Cleanliness / OBHS</option>
                <option value="WATER_AVAILABILITY">Water Availability</option>
                <option value="ELECTRICAL_AC">Electrical / AC Cooling</option>
                <option value="SECURITY">Security / RPF Assistance</option>
                <option value="CATERING_QUALITY">Catering Quality / Overcharging</option>
                <option value="MEDICAL_EMERGENCY">Medical Emergency</option>
                <option value="STAFF_BEHAVIOUR">Staff Behaviour</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={rmDesc}
                onChange={(e) => setRmDesc(e.target.value)}
                placeholder="Describe the issue (e.g., AC cooling low in B1 near berth 17)..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#134074]"
              />
            </div>

            {rmError && <p className="text-xs text-red-600 font-semibold">{rmError}</p>}

            <button
              type="submit"
              disabled={rmLoading}
              className="w-full py-2.5 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-sm transition disabled:opacity-60"
            >
              {rmLoading ? "Submitting to Rail Madad..." : "Submit Rail Madad Grievance"}
            </button>
          </form>
        </div>

        {complaints.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Submitted Grievances ({complaints.length})
            </h3>
            {complaints.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl border border-slate-200 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono-rail font-bold text-[#0B2545]">
                    {c.referenceNo} • Train {c.trainNumber} {c.coachNumber ? `(${c.coachNumber})` : ""}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-[#134074]">
                    {c.status}
                  </span>
                </div>
                <div className="font-semibold text-slate-800">{c.category.replace("_", " ")}</div>
                <div className="text-slate-600">{c.description}</div>
                {c.resolution && (
                  <div className="text-[11px] text-emerald-700 font-medium">{c.resolution}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
