"use client";

import React, { useEffect, useState } from "react";
import { LayoutGrid, Train } from "lucide-react";
import { TrainCoachDTO, TrainDTO } from "@/lib/types";
import { CLASS_DISPLAY_MAP, CLASS_FULL_NAME } from "@/lib/railway-logic";

interface CoachMapModuleProps {
  trains: TrainDTO[];
}

export default function CoachMapModule({ trains }: CoachMapModuleProps) {
  const [trainNo, setTrainNo] = useState(trains[0]?.trainNumber || "12723");
  const [coaches, setCoaches] = useState<TrainCoachDTO[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<TrainCoachDTO | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCoaches = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/coaches/${encodeURIComponent(trainNo)}`);
        const data = await res.json();
        if (res.ok) {
          setCoaches(data.coaches || []);
          const firstPassengerCoach =
            (data.coaches || []).find((c: TrainCoachDTO) => c.totalBerths > 0) || null;
          setSelectedCoach(firstPassengerCoach);
        }
      } finally {
        setLoading(false);
      }
    };
    loadCoaches();
  }, [trainNo]);

  // Group seats by cabinNumber
  const cabins = new Map<number, TrainCoachDTO["seats"]>();
  if (selectedCoach) {
    for (const s of selectedCoach.seats) {
      const list = cabins.get(s.cabinNumber) || [];
      list.push(s);
      cabins.set(s.cabinNumber, list);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <LayoutGrid className="w-5 h-5 text-[#F97316]" />
          <div className="flex-1 max-w-md">
            <label className="block text-[11px] font-semibold text-slate-500">
              Select Train Rake Composition
            </label>
            <select
              value={trainNo}
              onChange={(e) => setTrainNo(e.target.value)}
              className="mt-0.5 w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#134074]"
            >
              {trains.map((t) => (
                <option key={t.trainNumber} value={t.trainNumber}>
                  {t.trainNumber} — {t.trainName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400" /> Available
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#F97316]" /> Booked / Occupied
          </span>
        </div>
      </div>

      {/* Horizontal Scrollable Rake Diagram */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Physical Rake Order (From Engine to SLR)
          </h3>
          <span className="text-xs text-slate-400">Click any passenger coach to inspect berths</span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading rake diagram...</div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-3 rake-scroll">
            {coaches.map((coach) => {
              const isNonPassenger = coach.totalBerths === 0;
              const isSelected = selectedCoach?.id === coach.id;
              const occupiedCount = coach.seats.filter((s) => s.occupied).length;

              return (
                <button
                  key={coach.id}
                  type="button"
                  disabled={isNonPassenger}
                  onClick={() => setSelectedCoach(coach)}
                  className={`shrink-0 w-20 p-2.5 rounded-xl border text-center transition ${
                    coach.coachClass === "ENG"
                      ? "bg-[#0B2545] text-white border-[#0B2545] cursor-default"
                      : isNonPassenger
                      ? "bg-slate-200 text-slate-600 border-slate-300 cursor-default"
                      : isSelected
                      ? "bg-[#134074] text-white border-[#F97316] ring-2 ring-[#F97316]/40"
                      : "bg-slate-50 hover:bg-sky-50 text-slate-800 border-slate-300"
                  }`}
                >
                  <div className="text-[10px] font-mono-rail opacity-70">#{coach.rakePosition}</div>
                  <div className="font-mono-rail font-bold text-sm mt-0.5 flex items-center justify-center gap-1">
                    {coach.coachClass === "ENG" && <Train className="w-3.5 h-3.5 text-[#F97316]" />}
                    {coach.coachCode}
                  </div>
                  <div className="text-[10px] mt-0.5 font-semibold">
                    {CLASS_DISPLAY_MAP[coach.coachClass]}
                  </div>
                  {!isNonPassenger && occupiedCount > 0 && (
                    <div
                      className={`mt-1 text-[9px] font-mono-rail px-1 rounded ${
                        isSelected ? "bg-[#F97316] text-white" : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      {occupiedCount} booked
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Compartment Berth Layout */}
      {selectedCoach && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-[#0B2545]">
                Coach <span className="font-mono-rail">{selectedCoach.coachCode}</span> —{" "}
                {CLASS_FULL_NAME[selectedCoach.coachClass]}
              </h3>
              <p className="text-xs text-slate-500">
                Total Berths/Seats: {selectedCoach.totalBerths} • Rake Position #
                {selectedCoach.rakePosition}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(cabins.entries()).map(([cabinNo, seats]) => (
              <div
                key={cabinNo}
                className="border border-slate-200 rounded-xl p-3 bg-slate-50/70"
              >
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Bay / Cabin {cabinNo}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {seats.map((seat) => (
                    <div
                      key={seat.id}
                      title={
                        seat.occupied
                          ? `Booked: ${seat.passengerName} (PNR ${seat.pnr})`
                          : `Available: Berth ${seat.berthNumber} (${seat.berthType})`
                      }
                      className={`p-2 rounded-lg border text-center transition ${
                        seat.occupied
                          ? "bg-[#F97316] text-white border-orange-600 shadow-sm"
                          : "bg-emerald-50 text-emerald-900 border-emerald-300"
                      }`}
                    >
                      <div className="font-mono-rail font-bold text-xs">{seat.berthNumber}</div>
                      <div className="text-[10px] font-semibold opacity-90">{seat.berthType}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
