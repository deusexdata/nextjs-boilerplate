"use client";
import { useEffect, useState } from "react";

export default function Page() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Pagination states
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

  // Sort PNL by last trade time
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

  // Total PNL
  const totalPnl =
    data.pnl.reduce((sum: number, t: any) => sum + (t.total ?? 0), 0) || 0;

  // ----------------------------------------
  // 4) WIN RATE (SELLS ONLY)
  // ----------------------------------------
  const sells = data.lastTrades.filter((t: any) => t.side === "SELL");
  const wins = sells.filter((t: any) => t.priceUsd > 0);
  const winRate = sells.length > 0 ? (wins.length / sells.length) * 100 : 0;

  // ----------------------------------------
  // 18) TRADE SUMMARY BOX
  // ----------------------------------------
  const buys = data.lastTrades.filter((t: any) => t.side === "BUY").length;
  const totalTrades = data.lastTrades.length;

  const totalVolumeUsd = data.lastTrades.reduce(
    (sum: number, t: any) => sum + (t.priceUsd || 0),
    0
  );

  const avgTradeUsd =
    totalTrades > 0 ? totalVolumeUsd / totalTrades : 0;

  const lastTradeTime =
    totalTrades > 0 ? new Date(data.lastTrades[0].time).toLocaleString() : "N/A";

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

      {/* SUMMARY BOX */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ TRADE SUMMARY ]</h2>

        <div className="grid grid-cols-2 gap-4 text-lg mt-3">
          <div>📈 Total Trades: <span className="text-[#E4B300]">{totalTrades}</span></div>
          <div>🟢 Buys: <span className="text-green-400">{buys}</span></div>

          <div>🔴 Sells: <span className="text-red-400">{sells.length}</span></div>
          <div>💰 Total Volume USD: <span className="text-blue-300">${totalVolumeUsd.toFixed(2)}</span></div>

          <div>📊 Avg Trade Size: <span className="text-purple-300">${avgTradeUsd.toFixed(2)}</span></div>
          <div>🏆 Win Rate: <span className="text-green-300">{winRate.toFixed(1)}%</span></div>

          <div>🕒 Last Trade: <span className="text-yellow-300">{lastTradeTime}</span></div>
        </div>
      </section>

      {/* BEST & WORST */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ PERFORMANCE HIGHLIGHTS ]</h2>

        <div className="grid grid-cols-2 gap-4 text-lg mt-3">
          <div>
            🥇 <span className="text-green-300">BEST:</span>
            <div className="font-mono">{best?.mint}</div>
            <div className="text-green-400">
              +{best?.total.toFixed(2)} USD
            </div>
          </div>

          <div>
            🥀 <span className="text-red-400">WORST:</span>
            <div className="font-mono">{worst?.mint}</div>
            <div className="text-red-400">
              {worst?.total.toFixed(2)} USD
            </div>
          </div>
        </div>
      </section>

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
              <th>Time</th>
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
