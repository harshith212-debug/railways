"use client";

import React from "react";
import { TrainFront } from "lucide-react";

interface PageLoaderProps {
  title?: string;
  subtitle?: string;
}

export default function PageLoader({
  title = "Loading Rail Yatra",
  subtitle = "Syncing schedules, live availability & R-Wallet...",
}: PageLoaderProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-sm w-full text-center space-y-4">
        <div className="relative mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0B2545] to-[#134074] flex items-center justify-center shadow-lg">
          <TrainFront className="w-7 h-7 text-[#F97316] animate-bounce" />
          <span className="absolute -inset-1 rounded-2xl border-2 border-[#F97316]/30 animate-ping" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#0B2545]">{title}</h3>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-gradient-to-r from-[#134074] via-[#F97316] to-[#134074] rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
