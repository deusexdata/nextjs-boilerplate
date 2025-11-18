"use client";
import { useEffect, useState } from "react";

export default function Page() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch("/api/wallet");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Frontend load error:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center text-center">
        Initializing Deus Terminal…
      </main>
    );
  }

  const totalPnl =
    data.pnl.reduce((sum: number, t: any) => sum + (t.total ?? 0), 0) || 0;

  return (
    <main className="min-h-screen p-8 space-y-12">
      {/* HEADER */}
      <h1 className="text-4xl mb-2">
        ► DEUS VISION :: ON-CHAIN INTELLIGENCE TERMINAL
      </h1>

      <p className="text-md text-[#E4B300]">
        Monitoring Wallet:
        <span className="font-mono ml-2">{data.wallet}</span>
      </p>

      {/* SOL BALANCE */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ SOL BALANCE ]</h2>
        <p className="text-2xl">{data.solBalance.toFixed(4)} SOL</p>
      </section>

      {/* TOTAL PNL */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ TOTAL PNL ]</h2>

        <p
          className={
            totalPnl >= 0 ? "text-green-400 text-3xl" : "text-red-400 text-3xl"
          }
        >
          {totalPnl >= 0 ? "+" : ""}
          {totalPnl.toFixed(2)} USD
        </p>
      </section>

      {/* PNL PER TOKEN */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ PNL BY TOKEN ]</h2>

        <table className="terminal-table">
          <thead>
            <tr>
              <th>Token Mint</th>
              <th>Realized</th>
              <th>Unrealized</th>
              <th>Total PNL</th>
            </tr>
          </thead>

          <tbody>
            {data.pnl.map((t: any) => (
              <tr key={t.mint}>
                <td className="font-mono">{t.mint}</td>

                <td className={t.realized >= 0 ? "text-green-300" : "text-red-400"}>
                  {t.realized >= 0 ? "+" : ""}
                  {t.realized.toFixed(2)}
                </td>

                <td className={t.unrealized >= 0 ? "text-green-300" : "text-red-400"}>
                  {t.unrealized >= 0 ? "+" : ""}
                  {t.unrealized.toFixed(2)}
                </td>

                <td className={t.total >= 0 ? "text-green-300" : "text-red-400"}>
                  {t.total >= 0 ? "+" : ""}
                  {t.total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* RECENT TRADES */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ RECENT TRADES ]</h2>

        <table className="terminal-table">
          <thead>
            <tr>
              <th>TX</th>
              <th>Time</th>
              <th>Side</th>
              <th>Mint</th>
              <th>Amount</th>
              <th>USD</th>
            </tr>
          </thead>

          <tbody>
            {data.lastTrades.map((t: any, i: number) => (
              <tr key={i}>
                <td>
                  <a
                    href={`https://solscan.io/tx/${t.tx}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t.tx.slice(0, 10)}…
                  </a>
                </td>
                <td>{new Date(t.time).toLocaleString()}</td>

                <td className={t.side === "BUY" ? "text-green-300" : "text-red-400"}>
                  {t.side}
                </td>

                <td>{t.mint}</td>

                <td>{t.amount}</td>

                <td>${t.priceUsd.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
