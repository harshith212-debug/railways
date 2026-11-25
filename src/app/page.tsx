"use client";

import React, { useEffect, useState } from "react";
import {
  TicketCheck,
  QrCode,
  Wallet,
  Navigation,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Header, { ModuleKey } from "@/components/Header";
import PageLoader from "@/components/PageLoader";
import WalletModal from "@/components/WalletModal";
import ReservedBookingModule from "@/components/ReservedBookingModule";
import UtsQrModule from "@/components/UtsQrModule";
import PnrErsModule from "@/components/PnrErsModule";
import LiveStatusModule from "@/components/LiveStatusModule";
import CoachMapModule from "@/components/CoachMapModule";
import EcateringMadadModule from "@/components/EcateringMadadModule";
import {
  BookingDTO,
  EcateringOrderDTO,
  MasterPassengerDTO,
  RailMadadComplaintDTO,
  StationDTO,
  TrainDTO,
  UserDTO,
  UtsTicketDTO,
  WalletTransactionDTO,
} from "@/lib/types";

const LS_KEY = "railyatra_fallback_cache_v1";

export default function RailYatraDashboardPage() {
  const [activeModule, setActiveModule] = useState<ModuleKey>("RESERVED");
  const [moduleSwitching, setModuleSwitching] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [focusedPnr, setFocusedPnr] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [dbMode, setDbMode] = useState<string>("FALLBACK_IN_MEMORY");
  const [user, setUser] = useState<UserDTO | null>(null);
  const [masterPassengers, setMasterPassengers] = useState<MasterPassengerDTO[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransactionDTO[]>([]);
  const [stations, setStations] = useState<StationDTO[]>([]);
  const [trains, setTrains] = useState<TrainDTO[]>([]);
  const [totalStationsCount, setTotalStationsCount] = useState<number>(0);
  const [totalTrainsCount, setTotalTrainsCount] = useState<number>(0);
  const [bookings, setBookings] = useState<BookingDTO[]>([]);
  const [utsTickets, setUtsTickets] = useState<UtsTicketDTO[]>([]);
  const [ecateringOrders, setEcateringOrders] = useState<EcateringOrderDTO[]>([]);
  const [complaints, setComplaints] = useState<RailMadadComplaintDTO[]>([]);

  useEffect(() => {
    const loadBootstrap = async () => {
      try {
        const res = await fetch("/api/bootstrap");
        const data = await res.json();
        setDbMode(data.mode || "FALLBACK_IN_MEMORY");
        setUser(data.user);
        setMasterPassengers(data.masterPassengers || []);
        setWalletTransactions(data.walletTransactions || []);
        setStations(data.stations || []);
        setTrains(data.trains || []);
        setTotalStationsCount(data.totalStationsCount || (data.stations || []).length);
        setTotalTrainsCount(data.totalTrainsCount || (data.trains || []).length);
        setBookings(data.bookings || []);
        setUtsTickets(data.utsTickets || []);
        setEcateringOrders(data.ecateringOrders || []);
        setComplaints(data.complaints || []);

        try {
          localStorage.setItem(LS_KEY, JSON.stringify(data));
        } catch {
          // ignore storage quota errors
        }
      } catch {
        try {
          const cached = localStorage.getItem(LS_KEY);
          if (cached) {
            const data = JSON.parse(cached);
            setUser(data.user);
            setMasterPassengers(data.masterPassengers || []);
            setWalletTransactions(data.walletTransactions || []);
            setStations(data.stations || []);
            setTrains(data.trains || []);
            setBookings(data.bookings || []);
            setUtsTickets(data.utsTickets || []);
            setEcateringOrders(data.ecateringOrders || []);
            setComplaints(data.complaints || []);
          }
        } catch {
          // ignore
        }
      } finally {
        setLoading(false);
      }
    };
    loadBootstrap();
  }, []);

  const handleTopUpWallet = async (amount: number, method: string) => {
    const res = await fetch("/api/wallet/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, method }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Top-up failed.");
    setUser(data.user);
    setWalletTransactions((prev) => [data.transaction, ...prev]);
  };

  const switchModule = (mod: ModuleKey) => {
    if (mod === activeModule) return;
    setModuleSwitching(true);
    setActiveModule(mod);
    setTimeout(() => setModuleSwitching(false), 220);
  };

  const handleQuickPnrSearch = (pnr: string) => {
    setFocusedPnr(pnr);
    switchModule("PNR");
  };

  const handleBookingCreated = (booking: BookingDTO, newWalletBalance: number) => {
    setBookings((prev) => [booking, ...prev]);
    setUser((prev) => (prev ? { ...prev, walletBalance: newWalletBalance } : prev));
  };

  const handleBookingUpdated = (updated: BookingDTO, newWalletBalance: number) => {
    setBookings((prev) => prev.map((b) => (b.pnr === updated.pnr ? updated : b)));
    setUser((prev) => (prev ? { ...prev, walletBalance: newWalletBalance } : prev));
  };

  const handleUtsBooked = (ticket: UtsTicketDTO, newWalletBalance: number) => {
    setUtsTickets((prev) => [ticket, ...prev]);
    setUser((prev) => (prev ? { ...prev, walletBalance: newWalletBalance } : prev));
  };

  const handleOrderCreated = (order: EcateringOrderDTO, newWalletBalance: number) => {
    setEcateringOrders((prev) => [order, ...prev]);
    setUser((prev) => (prev ? { ...prev, walletBalance: newWalletBalance } : prev));
  };

  const handleComplaintCreated = (complaint: RailMadadComplaintDTO) => {
    setComplaints((prev) => [complaint, ...prev]);
  };

  const activeBookingsCount = bookings.filter((b) => b.bookingStatus !== "CANCELLED").length;
  const activeUtsCount = utsTickets.filter(
    (u) => new Date(u.validUntil).getTime() > Date.now()
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9]">
      <Header
        activeModule={activeModule}
        onSelectModule={switchModule}
        user={user}
        dbMode={dbMode}
        onOpenWallet={() => setWalletModalOpen(true)}
        onQuickPnrSearch={handleQuickPnrSearch}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {loading ? (
          <PageLoader
            title="Loading Rail Yatra Super-App"
            subtitle="Loading 100+ Indian Railway Stations, Trains & R-Wallet..."
          />
        ) : moduleSwitching ? (
          <PageLoader
            title={`Loading ${activeModule} Module`}
            subtitle="Fetching live Indian Railways data..."
          />
        ) : (
          <>
            {/* Journey Command Overview Strip */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 no-print">
              <button
                type="button"
                onClick={() => setActiveModule("PNR")}
                className="group text-left bg-white hover:border-[#134074] rounded-2xl p-4 border border-slate-200/90 shadow-[0_2px_10px_-3px_rgba(11,37,69,0.07)] transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#134074] flex items-center justify-center">
                    <TicketCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Active Journeys
                    </div>
                    <div className="text-lg font-bold font-mono-rail text-[#0B2545]">
                      {activeBookingsCount} PNR{activeBookingsCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#134074] transition" />
              </button>

              <button
                type="button"
                onClick={() => setActiveModule("UTS")}
                className="group text-left bg-white hover:border-[#F97316] rounded-2xl p-4 border border-slate-200/90 shadow-[0_2px_10px_-3px_rgba(11,37,69,0.07)] transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F97316] flex items-center justify-center">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      UTS QR Passes
                    </div>
                    <div className="text-lg font-bold font-mono-rail text-[#0B2545]">
                      {activeUtsCount} Active
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  3% Off
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWalletModalOpen(true)}
                className="group text-left bg-white hover:border-emerald-500 rounded-2xl p-4 border border-slate-200/90 shadow-[0_2px_10px_-3px_rgba(11,37,69,0.07)] transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      R-Wallet Balance
                    </div>
                    <div className="text-lg font-bold font-mono-rail text-[#0B2545]">
                      ₹{user ? user.walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
                    </div>
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-emerald-500" />
              </button>

              <button
                type="button"
                onClick={() => setActiveModule("LIVE")}
                className="group text-left bg-gradient-to-br from-[#0B2545] to-[#134074] text-white rounded-2xl p-4 shadow-md hover:shadow-lg transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 text-[#F97316] flex items-center justify-center">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-sky-200 uppercase tracking-wider">
                      Live NTES Radar
                    </div>
                    <div className="text-sm font-bold text-white">
                      {totalTrainsCount.toLocaleString("en-IN")} Trains •{" "}
                      {totalStationsCount.toLocaleString("en-IN")} Stns
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-sky-300 group-hover:translate-x-0.5 transition" />
              </button>
            </section>

            {/* Active Module View */}
            {activeModule === "RESERVED" && (
              <ReservedBookingModule
                stations={stations}
                masterPassengers={masterPassengers}
                walletBalance={user?.walletBalance ?? 0}
                onBookingCreated={handleBookingCreated}
                onViewPnr={(pnr) => {
                  setFocusedPnr(pnr);
                  setActiveModule("PNR");
                }}
              />
            )}

            {activeModule === "UTS" && (
              <UtsQrModule
                stations={stations}
                utsTickets={utsTickets}
                onUtsBooked={handleUtsBooked}
              />
            )}

            {activeModule === "PNR" && (
              <PnrErsModule
                bookings={bookings}
                initialPnr={focusedPnr}
                onBookingUpdated={handleBookingUpdated}
              />
            )}

            {activeModule === "LIVE" && <LiveStatusModule trains={trains} />}

            {activeModule === "COACHES" && <CoachMapModule trains={trains} />}

            {activeModule === "ECATERING" && (
              <EcateringMadadModule
                bookings={bookings}
                stations={stations}
                trains={trains}
                orders={ecateringOrders}
                complaints={complaints}
                onOrderCreated={handleOrderCreated}
                onComplaintCreated={handleComplaintCreated}
              />
            )}
          </>
        )}
      </main>

      <footer className="bg-[#071A33] text-slate-300 text-xs py-5 px-6 mt-auto border-t border-white/10 no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-white">
            Rail Yatra — Unified Indian Railways Super-App
          </span>
          <span className="font-mono-rail text-sky-200/70">
            IRCTC • UTS • NTES • R-WALLET • E-CATERING • RAIL MADAD 139
          </span>
        </div>
      </footer>

      <WalletModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        user={user}
        transactions={walletTransactions}
        onTopUp={handleTopUpWallet}
      />
    </div>
  );
}
