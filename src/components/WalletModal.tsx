"use client";

import React, { useState } from "react";
import { X, Wallet, ArrowUpRight, ArrowDownLeft, Sparkles } from "lucide-react";
import { UserDTO, WalletTransactionDTO } from "@/lib/types";

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
  user: UserDTO | null;
  transactions: WalletTransactionDTO[];
  onTopUp: (amount: number, method: string) => Promise<void>;
}

const PRESET_AMOUNTS = [500, 1000, 2000, 5000];

export default function WalletModal({
  open,
  onClose,
  user,
  transactions,
  onTopUp,
}: WalletModalProps) {
  const [amount, setAmount] = useState("1000");
  const [method, setMethod] = useState("BHIM UPI");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const val = Number(amount);
    if (!val || val <= 0) {
      setError("Enter a valid positive amount.");
      return;
    }
    setLoading(true);
    try {
      await onTopUp(val, method);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Top-up failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-[#0B2545] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Wallet className="w-5 h-5 text-[#F97316]" />
            <div>
              <h2 className="font-bold text-base">Rail Yatra R-Wallet</h2>
              <p className="text-xs text-sky-200">Zero-fee IRCTC & 3% UTS Discount Ledger</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">Available Balance</div>
              <div className="text-2xl font-bold font-mono-rail text-[#0B2545]">
                ₹{user ? user.walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                <Sparkles className="w-3.5 h-3.5" /> 3% Off on UTS
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">Add Money to R-Wallet</label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setAmount(String(preset))}
                  className={`py-2 rounded-lg text-xs font-mono-rail font-semibold border transition ${
                    Number(amount) === preset
                      ? "bg-[#134074] text-white border-[#134074]"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  +₹{preset}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min={1}
                max={50000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono-rail focus:outline-none focus:ring-2 focus:ring-[#134074]"
                placeholder="Amount (₹)"
              />
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#134074]"
              >
                <option value="BHIM UPI">BHIM UPI</option>
                <option value="GPay / PhonePe">GPay / PhonePe</option>
                <option value="SBI NetBanking">SBI NetBanking</option>
                <option value="RuPay Debit Card">RuPay Debit Card</option>
              </select>
            </div>
            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#F97316] hover:bg-orange-600 text-white font-semibold text-sm transition disabled:opacity-60"
            >
              {loading ? "Processing Recharge..." : `Add ₹${amount || 0} to R-Wallet`}
            </button>
          </form>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Immutable Wallet Ledger
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {transactions.map((txn) => {
                const isCredit = txn.txnType === "CREDIT" || txn.txnType === "REFUND";
                return (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg ${
                          isCredit ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{txn.description}</div>
                        <div className="text-[11px] text-slate-500 font-mono-rail">
                          Ref: {txn.referenceId} • {new Date(txn.createdAt).toLocaleString("en-IN")}
                        </div>
                        {txn.cashbackAmt > 0 && (
                          <span className="inline-block mt-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            3% UTS Savings: ₹{txn.cashbackAmt.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right font-mono-rail">
                      <div className={`font-bold ${isCredit ? "text-emerald-700" : "text-slate-900"}`}>
                        {isCredit ? "+" : "-"}₹{txn.amount.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400">Bal: ₹{txn.balanceAfter.toFixed(2)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
