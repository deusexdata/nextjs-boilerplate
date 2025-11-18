"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [wallet, setWallet] = useState("FXgeLoEMxTSf4Tfg7E1cbVAMEyPVJsSUGR1wkAU17iZW");
  const [trades, setTrades] = useState<any[]>([]);
  const [pnl, setPnl] = useState(0);
  const [totalBuys, setTotalBuys] = useState(0);
  const [totalSells, setTotalSells] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchTrades = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/wallet/${wallet}`);
      const data = await res.json();

      if (data.trades) {
        setTrades(data.trades);
        setPnl(data.pnl);
        setTotalBuys(data.totalBuys);
        setTotalSells(data.totalSells);
      }
    } catch (e) {
      console.log("Error loading trades:", e);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Solana Wallet Analyzer</h1>

      <div className="mb-4">
        <input
          className="border p-2 w-full rounded"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded mt-3"
          onClick={fetchTrades}
        >
          Analyze
        </button>
      </div>

      {/* PNL Summary */}
      <div className="bg-gray-900 p-4 rounded-lg text-white mb-6">
        <p className="text-xl">📊 Total PNL:  
          <span className={pnl >= 0 ? "text-green-400" : "text-red-400"}>
            {" "}
            ${pnl.toFixed(2)}
          </span>
        </p>
        <p className="mt-2 text-gray-300">💸 Total Buys: ${totalBuys.toFixed(2)}</p>
        <p className="text-gray-300">💰 Total Sells: ${totalSells.toFixed(2)}</p>
      </div>

      {/* Trades List */}
      {loading ? (
        <p className="text-white">Loading...</p>
      ) : trades.length === 0 ? (
        <p className="text-gray-400">No trades found.</p>
      ) : (
        <div className="grid gap-4">
          {trades.map((t, i) => (
            <div key={i} className="bg-gray-800 p-4 rounded-lg text-white">
              <p className="font-bold">{t.tokenName} ({t.tokenSymbol})</p>

              <div className="flex justify-between mt-2 text-sm text-gray-400">
                <span>Tx:</span>
                <a
                  href={`https://solscan.io/tx/${t.txid}`}
                  target="_blank"
                  className="text-blue-400 underline"
                >
                  View
                </a>
              </div>

              <p className="text-sm mt-2">
                Bought: {t.fromSymbol !== "SOL" ? t.fromAmount.toFixed(2) : "-"}  
              </p>

              <p className="text-sm">
                Sold: {t.toSymbol === "SOL" ? t.toAmount.toFixed(4) + " SOL" : "-"}
              </p>

              <p className="text-sm mt-1">USD Volume: ${t.volumeUsd.toFixed(2)}</p>

              <p className="text-sm mt-1 text-gray-400">
                Program: {t.program}
              </p>

              <p className="text-xs mt-1 text-gray-500">
                {new Date(t.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
