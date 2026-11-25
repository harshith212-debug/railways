"use client";

import React, { useEffect, useState } from "react";
import { Navigation, MapPin, Play, Clock, RefreshCw } from "lucide-react";
import { LiveTrainStatusDTO, TrainDTO } from "@/lib/types";

interface LiveStatusModuleProps {
  trains: TrainDTO[];
}

export default function LiveStatusModule({ trains }: LiveStatusModuleProps) {
  const [selectedTrainNo, setSelectedTrainNo] = useState(trains[0]?.trainNumber || "12723");
  const [liveStatus, setLiveStatus] = useState<LiveTrainStatusDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const fetchStatus = async (trainNo: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/live-status/${encodeURIComponent(trainNo)}`);
      const data = await res.json();
      if (res.ok) setLiveStatus(data.liveStatus);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus(selectedTrainNo);
  }, [selectedTrainNo]);

  const handleSimulateNext = async () => {
    setSimulating(true);
    try {
      const res = await fetch(`/api/live-status/${encodeURIComponent(selectedTrainNo)}/simulate`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) setLiveStatus(data.liveStatus);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <Navigation className="w-5 h-5 text-[#F97316]" />
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-slate-500">
              Select Running Train (NTES Live)
            </label>
            <select
              value={selectedTrainNo}
              onChange={(e) => setSelectedTrainNo(e.target.value)}
              className="mt-0.5 w-full max-w-md px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#134074]"
            >
              {trains.map((t) => (
                <option key={t.trainNumber} value={t.trainNumber}>
                  {t.trainNumber} — {t.trainName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchStatus(selectedTrainNo)}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleSimulateNext}
            disabled={simulating}
            className="px-4 py-2.5 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-60"
          >
            <Play className="w-3.5 h-3.5" />
            {simulating ? "Advancing..." : "Simulate Next Stop"}
          </button>
        </div>
      </div>

      {liveStatus && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Live Summary Header */}
          <div className="bg-[#0B2545] text-white p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-rail font-bold px-2 py-0.5 rounded bg-[#134074] text-sm">
                  {liveStatus.trainNumber}
                </span>
                <h3 className="font-bold text-base">{liveStatus.trainName}</h3>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    liveStatus.delayMinutes === 0
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                  }`}
                >
                  {liveStatus.delayMinutes === 0
                    ? "Right Time"
                    : `Delayed by ${liveStatus.delayMinutes} min`}
                </span>
              </div>
              <p className="text-xs text-sky-200 mt-1.5">
                Last Crossed:{" "}
                <strong className="text-white">
                  {liveStatus.lastCrossedStationName} ({liveStatus.lastCrossedStation})
                </strong>{" "}
                • Next Stop:{" "}
                <strong className="text-white">
                  {liveStatus.nextStationName} ({liveStatus.nextStation})
                </strong>
              </p>
            </div>

            <div className="text-right text-xs">
              <div className="inline-flex items-center gap-1.5 text-sky-200 font-mono-rail">
                <MapPin className="w-3.5 h-3.5 text-[#F97316]" />
                GPS: {liveStatus.currentLat}°N, {liveStatus.currentLng}°E
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Updated: {new Date(liveStatus.updatedAt).toLocaleTimeString("en-IN")}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-6 pt-4 pb-2 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1.5">
              <span>Journey Progress</span>
              <span className="font-mono-rail">{liveStatus.progressPercent}% Completed</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#F97316] rounded-full transition-all duration-500"
                style={{ width: `${Math.max(4, liveStatus.progressPercent)}%` }}
              />
            </div>
          </div>

          {/* Vertical Timeline */}
          <div className="p-6">
            <div className="space-y-0">
              {liveStatus.stops.map((stop, idx) => {
                const isLast = idx === liveStatus.stops.length - 1;
                const isCurrent = stop.status === "CURRENT";
                const isCrossed = stop.status === "CROSSED";

                return (
                  <div key={stop.stationCode} className="flex gap-4">
                    {/* Timeline Line & Node */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                          isCurrent
                            ? "bg-[#F97316] border-orange-200 ring-4 ring-orange-100"
                            : isCrossed
                            ? "bg-emerald-600 border-emerald-200"
                            : "bg-white border-slate-300"
                        }`}
                      />
                      {!isLast && (
                        <div
                          className={`w-0.5 flex-1 my-1 ${
                            isCrossed ? "bg-emerald-500" : "bg-slate-200"
                          }`}
                        />
                      )}
                    </div>

                    {/* Stop Details */}
                    <div
                      className={`flex-1 pb-6 ${
                        isCurrent ? "bg-orange-50/70 -mx-2 px-3 py-2 rounded-xl border border-orange-200 mb-3" : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono-rail font-bold text-sm text-[#0B2545]">
                              {stop.stationCode}
                            </span>
                            <span className="font-bold text-sm text-slate-900">
                              {stop.stationName}
                            </span>
                            <span className="text-[10px] font-mono-rail px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              PF #{stop.platform}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F97316] text-white">
                                LIVE POSITION
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono-rail mt-0.5">
                            Day {stop.dayOfJourney} • {stop.distanceFromOriginKm} km •{" "}
                            {stop.haltMinutes > 0 ? `Halt ${stop.haltMinutes}m` : "Terminal"}
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-xs font-mono-rail">
                          <div className="text-right">
                            <div className="text-[10px] text-slate-400">ARR (Sch / Act)</div>
                            <div>
                              <span className="text-slate-500">{stop.scheduledArrival || "—"}</span>
                              {stop.actualArrival && (
                                <span
                                  className={`ml-1.5 font-bold ${
                                    stop.delayMinutes > 0 ? "text-amber-700" : "text-emerald-700"
                                  }`}
                                >
                                  {stop.actualArrival}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-slate-400">DEP (Sch / Act)</div>
                            <div>
                              <span className="text-slate-500">{stop.scheduledDeparture || "—"}</span>
                              {stop.actualDeparture && (
                                <span
                                  className={`ml-1.5 font-bold ${
                                    stop.delayMinutes > 0 ? "text-amber-700" : "text-emerald-700"
                                  }`}
                                >
                                  {stop.actualDeparture}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
