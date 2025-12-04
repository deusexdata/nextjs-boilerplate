"use client";
import { useEffect, useState } from "react";

export default function Page() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const PAGE_SIZE = 10;
  const [pnlPage, setPnlPage] = useState(0);
  const [tradePage, setTradePage] = useState(0);

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

  // Sort PNL by lastTrade timestamp (newest → oldest)
  const sortedPnl = [...data.pnl].sort((a, b) => b.lastTrade - a.lastTrade);

  // Pagination
  const paginatedPnl = sortedPnl.slice(
    pnlPage * PAGE_SIZE,
    (pnlPage + 1) * PAGE_SIZE
  );

  const paginatedTrades = data.lastTrades.slice(
    tradePage * PAGE_SIZE,
    (tradePage + 1) * PAGE_SIZE
  );

// NEW TOTAL PNL CALCULATION BASED ON SOL VALUE
const INITIAL_SOL = 2;

const currentValueUsd = data.solBalance * data.solPrice;
const initialValueUsd = INITIAL_SOL * data.solPrice;

const totalPnl = currentValueUsd - initialValueUsd;


  // BEST & WORST performers
  const bestToken =
    data.pnl.length > 0
      ? [...data.pnl].sort((a, b) => b.total - a.total)[0]
      : null;

  const worstToken =
    data.pnl.length > 0
      ? [...data.pnl].sort((a, b) => a.total - b.total)[0]
      : null;

  // Latest trade (UTC)
  const latestTradeTime =
    data.lastTrades.length > 0
      ? Math.max(...data.lastTrades.map((t: any) => t.time || 0))
      : null;

  const formatUtc = (ts: number) =>
    new Date(ts).toLocaleString("en-GB", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });

  // Trade Summary
  const buyCount = data.lastTrades.filter((t: any) => t.side === "BUY").length;
  const sellCount = data.lastTrades.filter((t: any) => t.side === "SELL").length;
  const totalVolumeUsd = data.lastTrades.reduce(
    (sum: number, t: any) => sum + (t.priceUsd ?? 0),
    0
  );

  const maxTrade =
    data.lastTrades.length > 0
      ? data.lastTrades.reduce(
          (max: any, t: any) => (t.priceUsd > max.priceUsd ? t : max),
          { priceUsd: 0 }
        )
      : null;

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

      {/* PERFORMANCE SUMMARY */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ PERFORMANCE SUMMARY ]</h2>

        <div className="space-y-2">
          {bestToken && (
            <p>
              🟢 <b>Best Performer:</b>{" "}
              <span className="font-mono text-green-300">
                {bestToken.mint}
              </span>{" "}
              <span className="text-green-300">
                (+{bestToken.total.toFixed(2)} USD)
              </span>
            </p>
          )}

          {worstToken && (
            <p>
              🔴 <b>Worst Performer:</b>{" "}
              <span className="font-mono text-red-400">
                {worstToken.mint}
              </span>{" "}
              <span className="text-red-400">
                ({worstToken.total.toFixed(2)} USD)
              </span>
            </p>
          )}

          {latestTradeTime && (
            <p>
              🕒 <b>Last Trade (UTC):</b> {formatUtc(latestTradeTime)}
            </p>
          )}
        </div>
      </section>

      {/* TRADE SUMMARY */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ TRADE SUMMARY ]</h2>

        <p>🟢 Buys: {buyCount}</p>
        <p>🔴 Sells: {sellCount}</p>
        <p>💰 Total Volume (USD): {totalVolumeUsd.toFixed(2)}</p>

        {maxTrade && (
          <p>
            🚀 Largest Trade:{" "}
            <span className="font-mono">{maxTrade.mint}</span> — $
            {maxTrade.priceUsd.toFixed(2)}
          </p>
        )}
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
            {paginatedPnl.map((t: any) => (
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

        {/* PNL Pagination */}
        <div className="flex justify-between mt-3">
          <button
            className="terminal-btn"
            onClick={() => setPnlPage((p) => Math.max(0, p - 1))}
            disabled={pnlPage === 0}
          >
            ◄ Prev
          </button>

          <button
            className="terminal-btn"
            onClick={() => setPnlPage((p) => p + 1)}
            disabled={(pnlPage + 1) * PAGE_SIZE >= sortedPnl.length}
          >
            Next ►
          </button>
        </div>
      </section>

      {/* RECENT TRADES */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ RECENT TRADES ]</h2>

        <table className="terminal-table">
          <thead>
            <tr>
              <th>TX</th>
              <th>Time (UTC)</th>
              <th>Side</th>
              <th>Mint</th>
              <th>Amount</th>
              <th>USD</th>
            </tr>
          </thead>

          <tbody>
            {paginatedTrades.map((t: any, i: number) => (
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

                <td>{formatUtc(t.time)}</td>

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

        {/* TRADES Pagination */}
        <div className="flex justify-between mt-3">
          <button
            className="terminal-btn"
            onClick={() => setTradePage((p) => Math.max(0, p - 1))}
            disabled={tradePage === 0}
          >
            ◄ Prev
          </button>

          <button
            className="terminal-btn"
            onClick={() => setTradePage((p) => p + 1)}
            disabled={(tradePage + 1) * PAGE_SIZE >= data.lastTrades.length}
          >
            Next ►
          </button>
        </div>
      </section>
    </main>
  );
}
