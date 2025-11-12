"use client";

import { useEffect, useState } from "react";

type TokenBalance = { mint: string; amount: number };
type Trade = {
  signature: string;
  time: string | null;
  mint: string;
  amount: number;
  side: "BUY" | "SELL";
};

type WalletData = {
  wallet: string;
  solBalance: number;
  tokens: TokenBalance[];
  trades: Trade[];
  error?: string;
};

export default function Home() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/wallet");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <main className="min-h-screen bg-black text-gray-100 flex items-center justify-center">
        <p>Loading Deus wallet data…</p>
      </main>
    );
  }

  if (!data || data.error) {
    return (
      <main className="min-h-screen bg-black text-red-400 flex items-center justify-center">
        <p>Failed to load wallet data.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-2">Deus Vision – Bot Wallet Monitor</h1>
      <p className="mb-6 text-sm text-gray-400">
        Watching wallet: <span className="font-mono">{data.wallet}</span>
      </p>

      {/* Balances */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Balances</h2>
        <p className="mb-2 text-lg">
          SOL: <span className="font-mono">{data.solBalance.toFixed(4)}</span>
        </p>
        <h3 className="font-semibold mt-4 mb-2">SPL Tokens</h3>
        {data.tokens.length === 0 && (
          <p className="text-sm">No SPL token balances detected.</p>
        )}
        <ul className="space-y-1 text-sm">
          {data.tokens.map((t) => (
            <li key={t.mint}>
              <span className="font-mono">{t.mint}</span> — {t.amount}
            </li>
          ))}
        </ul>
      </section>

      {/* Trades */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Recent Token Changes (Buys/Sells)</h2>
        {data.trades.length === 0 && (
          <p className="text-sm">No recent token activity detected for this wallet.</p>
        )}
        <ul className="space-y-2 text-sm">
          {data.trades.map((tr, idx) => (
            <li
              key={tr.signature + idx}
              className="border border-gray-700 p-3 rounded-md"
            >
              <div>
                <span
                  className={
                    tr.side === "BUY"
                      ? "text-green-400 font-semibold"
                      : "text-red-400 font-semibold"
                  }
                >
                  {tr.side}
                </span>{" "}
                {tr.amount} of{" "}
                <span className="font-mono">{tr.mint}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {tr.time || "Unknown time"} — tx: {tr.signature.slice(0, 8)}...
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}