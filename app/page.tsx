"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [wallet, setWallet] = useState("FXgeLoEMxTSf4Tfg7E1cbVAMEyPVJsSUGR1wkAU17iZW");
  const [loading, setLoading] = useState(false);

  const [pnl, setPnl] = useState(0);
  const [buys, setBuys] = useState(0);
  const [sells, setSells] = useState(0);
  const [trades, setTrades] = useState([]);

  async function loadWallet() {
    setLoading(true);

    const res = await fetch(`/api/wallet?address=${wallet}`);
    const data = await res.json();

    if (data.trades) {
      setTrades(data.trades);
      setPnl(data.pnl);
      setBuys(data.totalBuys);
      setSells(data.totalSells);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadWallet();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 text-white">
      <h1 className="text-3xl font-bold mb-5">Solana PNL Dashboard</h1>

      <div className="flex gap-2">
        <input
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          className="text-black p-2 flex-1 rounded"
        />
        <button
          onClick={loadWallet}
          className="bg-blue-500 px-4 py-2 rounded"
        >
          Load
        </button>
      </div>

      <div className="bg-gray-900 p-4 rounded mt-5">
        <p className="text-xl">
          Total PNL:{" "}
          <span className={pnl >= 0 ? "text-green-400" : "text-red-400"}>
            ${pnl.toFixed(2)}
          </span>
        </p>
        <p>Total Buys: ${buys.toFixed(2)}</p>
        <p>Total Sells: ${sells.toFixed(2)}</p>
      </div>

      <h2 className="text-2xl mt-6 mb-2">Trades</h2>

      {loading && <p>Loading…</p>}

      <div className="grid gap-3">
        {trades.map((t: any, i: number) => (
          <div key={i} className="bg-gray-800 p-4 rounded">
            <p className="text-lg font-semibold">
              {t.tokenName} ({t.tokenSymbol})
            </p>

            <p>{t.isBuy ? "BUY" : t.isSell ? "SELL" : "SWAP"}</p>

            <p className="text-sm">Volume: ${t.volumeUsd.toFixed(2)}</p>

            <a
              target="_blank"
              href={`https://solscan.io/tx/${t.txid}`}
              className="text-blue-400 underline"
            >
              View Transaction
            </a>

            <p className="text-xs text-gray-400 mt-1">
              {new Date(t.timestamp).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
