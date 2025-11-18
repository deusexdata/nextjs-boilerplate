"use client";

import { useEffect, useState } from "react";

type Token = {
  mint: string;
  amount: number;
  priceUsd?: number | null;
};

type Trade = {
  tx: string;
  time: string;
  program: string;
  volume: { usd: number; sol: number };
  price: { usd: number; sol: number };
  from: { token: any; amount: number };
  to: { token: any; amount: number };
};

type WalletData = {
  wallet: string;
  solBalance: number;
  tokens: Token[];
  recentTrades: Trade[];
};

export default function HomePage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [portfolioValue, setPortfolioValue] = useState<number>(0);

  async function load() {
    try {
      const res = await fetch("/api/wallet");
      const json = await res.json();
      setData(json);

      let total = 0;
      json.tokens.forEach((t: Token) => {
        if (t.priceUsd) total += t.amount * t.priceUsd;
      });
      setPortfolioValue(total);
    } catch (e) {
      console.error("Fetch error:", e);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center text-center terminal-glow">
        Loading Deus Terminal…
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 space-y-12 terminal-glow crt crt-screen">
      {/* HEADER */}
      <h1 className="text-4xl mb-2 terminal-glow">
        ► DEUS VISION :: ON-CHAIN INTELLIGENCE TERMINAL
      </h1>
      <p className="text-md text-[#E4B300]">
        Monitoring Wallet: <span className="font-mono">{data.wallet}</span>
      </p>

      {/* SOL BALANCE */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ SOL BALANCE ]</h2>
        <p className="text-2xl">{data.solBalance.toFixed(4)} SOL</p>
      </section>

      {/* PORTFOLIO VALUE */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ TOTAL PORTFOLIO VALUE ]</h2>
        <p className="text-3xl">${portfolioValue.toFixed(2)}</p>
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
                <th>Total Value</th>
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
                      ? `$${(t.amount * t.priceUsd).toFixed(2)}`
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* RECENT TRADES FROM SOLANATRACKER */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ RECENT TRADES — SOLANATRACKER ]</h2>

        {!data.recentTrades || data.recentTrades.length === 0 ? (
          <p>No recent trades.</p>
        ) : (
          <table className="terminal-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Side</th>
                <th>Amount</th>
                <th>USD Volume</th>
                <th>Price (USD)</th>
                <th>Program</th>
                <th>Time</th>
                <th>TxID</th>
              </tr>
            </thead>
            <tbody>
              {data.recentTrades.slice(0, 20).map((tr: any) => {
                const time = new Date(tr.time).toLocaleString();

                const side =
                  tr.from.token.symbol === "SOL" &&
                  tr.to.token.symbol !== "SOL"
                    ? "BUY"
                    : "SELL";

                const token =
                  side === "BUY" ? tr.to.token : tr.from.token;

                const amount =
                  side === "BUY" ? tr.to.amount : tr.from.amount;

                return (
                  <tr key={tr.tx}>
                    <td>
                      {token.symbol}
                      <br />
                      <span className="text-xs opacity-60">
                        {token.name}
                      </span>
                    </td>

                    <td
                      className={
                        side === "BUY"
                          ? "text-[#E4B300] font-bold"
                          : "text-red-400 font-bold"
                      }
                    >
                      {side}
                    </td>

                    <td>{Number(amount).toLocaleString()}</td>

                    <td>${tr.volume.usd.toFixed(2)}</td>

                    <td>${tr.price.usd.toFixed(8)}</td>

                    <td>{tr.program}</td>

                    <td>{time}</td>

                    <td>
                      <a
                        href={`https://solscan.io/tx/${tr.tx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {tr.tx.slice(0, 10)}...
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* SOCIAL BUTTONS */}
      <div className="terminal-buttons">
        <a
          href="https://twitter.com/DeusVisionAI"
          target="_blank"
          className="terminal-btn"
        >
          X / Twitter
        </a>

        <a
          href="https://t.me/DeusVisionAI"
          target="_blank"
          className="terminal-btn"
        >
          Telegram
        </a>

        <a
          href="https://dexscreener.com"
          target="_blank"
          className="terminal-btn"
        >
          Dexscreener
        </a>

        <a href="/alerts" target="_blank" className="terminal-btn">
          Access Alerts
        </a>
      </div>
    </main>
  );
}
