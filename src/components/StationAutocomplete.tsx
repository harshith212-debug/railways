"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { StationDTO } from "@/lib/types";

interface StationAutocompleteProps {
  label: string;
  value: string;
  onChange: (stationCode: string) => void;
  initialStations: StationDTO[];
}

export default function StationAutocomplete({
  label,
  value,
  onChange,
  initialStations,
}: StationAutocompleteProps) {
  const selected = initialStations.find((s) => s.stationCode === value);
  const [query, setQuery] = useState(
    selected ? `${selected.stationCode} — ${selected.stationName}` : value
  );
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<StationDTO[]>(initialStations.slice(0, 25));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const match = initialStations.find((s) => s.stationCode === value);
    if (match) {
      setQuery(`${match.stationCode} — ${match.stationName}`);
    } else if (value && !query.startsWith(value)) {
      setQuery(value);
    }
  }, [value, initialStations]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInput = async (val: string) => {
    setQuery(val);
    setOpen(true);
    try {
      const res = await fetch(`/api/stations/search?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.stations)) {
        setOptions(data.stations);
      }
    } catch {
      // keep current options on transient error
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <div className="relative">
        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="Search 8,990+ stations..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#134074]"
        />
      </div>

      {open && options.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl divide-y divide-slate-100">
          {options.map((st) => (
            <button
              key={st.stationCode}
              type="button"
              onClick={() => {
                onChange(st.stationCode);
                setQuery(`${st.stationCode} — ${st.stationName}`);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-sky-50 transition flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#0B2545] truncate">
                  <span className="font-mono-rail text-[#F97316] mr-1.5">{st.stationCode}</span>
                  {st.stationName}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {st.city}, {st.state} • {st.railwayZone}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
