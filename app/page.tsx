"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [wallet, setWallet] = useState("FXgeLoEMxTSf4Tfg7E1cbVAMEyPVJsSUGR1wkAU17iZW");
  const [trades, setTrades] = useState([]);
  const [pnl, setPnl] = useState(0);
  const [totalBuys, setTotalBuys] = useState(0);
  const [totalSells, setTotalSells] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);

    const res = await fetch(`/api/wallet/${wallet}`);
    const data = await res.json();

    if (data.trades) {
      setTrades(data.trades);
      setPnl(data.pnl);
      setTotalBuys(data.totalBuys);
      setTotalSells(data.totalSells);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-8 max-w-2xl mx-auto text-white">
      <h1 className="text-3xl font-bold mb-4">Solana Wallet PNL Viewer</h1>

      <input
        className="border p-2 w-full text-black"
        value={wallet}
        onChange={(e) => setWallet(e.target.value)}
      />

      <button
        className="bg-blue-600 px-4 py-2 rounded mt-3"
        onClick={load}
      >
        Analyze Wallet
      </button>

      <div className="bg-gray-900 mt-6 p-4 rounded">
        <p>Total PNL: {pnl.toFixed(2)}</p>
        <p>Total Buys: {totalBuys.toFixed(2)}</p>
        <p>Total Sells: {totalSells.toFixed(2)}</p>
      </div>

      <h2 className="text-xl mt-6 mb-2">Trades</h2>

      {loading ? <p>Loading...</p> : null}

      {trades.map((t: any, i) => (
        <div key={i} className="bg-gray-800 p-4 mb-2 rounded">
          <p>{t.tokenName} ({t.tokenSymbol})</p>
          <p>Volume: ${t.volumeUsd.toFixed(2)}</p>
          <p>{t.isBuy ? "BUY" : t.isSell ? "SELL" : "SWAP"}</p>
          <a
            className="text-blue-400 underline"
            href={`https://solscan.io/tx/${t.txid}`}
            target="_blank"
          >
            View Transaction
          </a>
        </div>
      ))}
    </div>
  );
}
