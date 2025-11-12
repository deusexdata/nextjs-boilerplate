"use client";
import { useEffect, useState } from "react";

type Token = {
  mint: string;
  amount: number;
  priceUsd?: number | null;
};

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
  tokens: Token[];
  trades: Trade[];
};

type ChartPoint = {
  time: number;
  value: number;
};

export default function Home() {
  const [data, setData] = useState<WalletData | null>(null);
  const [portfolioValue, setPortfolioValue] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/wallet");
      const json = await res.json();
      setData(json);

      // Calculate total portfolio value in USD based on token balances
      let total = 0;
      if (json.tokens) {
        json.tokens.forEach((t: Token) => {
          if (t.priceUsd) {
            total += t.amount * t.priceUsd;
          }
        });
      }
      setPortfolioValue(total);

      // Push new point to chart history
      setChartData((prev) => [
        ...prev.slice(-50), // keep last 50 points
        { time: Date.now(), value: total },
      ]);
    };

    load();
    const i = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(i);
  }, []);

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center text-center terminal-glow">
        Initializing Deus Terminal…
      </main>
    );
  }

  // Prepare chart points for SVG
  const hasChart = chartData.length > 1;
  let chartPoints = "";
  if (hasChart) {
    const values = chartData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    chartPoints = chartData
      .map((p, i) => {
        const x = (i / (chartData.length - 1)) * 100; // 0–100
        const normalized = (p.value - min) / range; // 0–1
        const y = 100 - normalized * 100; // invert for SVG (top = 0)
        return `${x},${y}`;
      })
      .join(" ");
  }

  return (
    <main className="min-h-screen p-8 space-y-12 terminal-glow crt crt-screen">
      {/* HEADER */}
      <h1 className="text-4xl mb-2 terminal-glow">
        ► DEUS VISION :: ON-CHAIN INTELLIGENCE TERMINAL
      </h1>
      <p className="text-md text-[#00ffaacc]">
        Monitoring Wallet: <span className="font-mono">{data.wallet}</span>
      </p>

      {/* SOL BALANCE */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ SOL BALANCE ]</h2>
        <p className="text-2xl">{data.solBalance.toFixed(4)} SOL</p>
      </section>

      {/* TOTAL PORTFOLIO VALUE */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ TOTAL PORTFOLIO VALUE ]</h2>
        <p className="text-3xl">${portfolioValue.toFixed(2)}</p>
      </section>

      {/* PORTFOLIO VALUE OVER TIME (MINIMAL CHART) */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ PORTFOLIO VALUE OVER TIME ]</h2>
        {hasChart ? (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" height="120">
            <polyline
              fill="none"
              stroke="#00ff9d"
              strokeWidth="1.5"
              points={chartPoints}
            />
          </svg>
        ) : (
          <p>Collecting data…</p>
        )}
      </section>

      {/* TOKENS HELD */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ TOKENS HELD ]</h2>

        {data.tokens.length === 0 ? (
          <p>No SPL tokens detected.</p>
        ) : (
          <table className="terminal-table">
            <thead>
              <tr>
                <th>Token Mint</th>
                <th>Amount</th>
                <th>Price (USD)</th>
                <th>Total Value (USD)</th>
              </tr>
            </thead>
            <tbody>
              {data.tokens.map((t) => (
                <tr key={t.mint}>
                  <td className="font-mono">{t.mint}</td>
                  <td>{t.amount}</td>
                  <td>{t.priceUsd ? `$${t.priceUsd.toFixed(6)}` : "N/A"}</td>
                  <td>
                    {t.priceUsd
                      ? `$${(t.priceUsd * t.amount).toFixed(2)}`
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* RECENT TRADES */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ RECENT TOKEN MOVEMENT ]</h2>

        {data.trades.length === 0 ? (
          <p>No recent trades detected.</p>
        ) : (
          <div className="space-y-4">
            {data.trades.map((tr, i) => (
              <div
                key={i}
                className="p-4 border border-[#00ff9d33] rounded"
              >
                <p>
                  <span
                    className={
                      tr.side === "BUY"
                        ? "text-green-300 font-bold"
                        : "text-red-400 font-bold"
                    }
                  >
                    {tr.side}
                  </span>{" "}
                  {tr.amount} of {tr.mint}
                </p>

                <p className="text-sm text-[#00ffaacc]">
                  {tr.time}
                </p>

                <a
                  href={`https://solscan.io/tx/${tr.signature}`}
                  target="_blank"
                >
                  TX → {tr.signature.slice(0, 12)}…
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
