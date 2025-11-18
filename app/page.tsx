"use client";

import { useEffect, useState } from "react";

type Token = { mint: string; amount: number; priceUsd?: number | null };
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
  trades: Trade[] | null | undefined;
};

export default function HomePage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [portfolioValue, setPortfolioValue] = useState<number>(0);

  async function load() {
    try {
      const res = await fetch("/api/wallet");
      const json = await res.json();
      if (!json) return;

      setData(json);

      let total = 0;
      json.tokens.forEach((t: Token) => {
        if (t.priceUsd) total += t.amount * t.priceUsd;
      });
      setPortfolioValue(total);
    } catch (err) {
      console.error("Frontend fetch error:", err);
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

/* RECENT TRADES – INCLUDING PNL FIX */
<section className="terminal-box">
  <h2 className="terminal-title">[ RECENT TRADES & PNL ]</h2>

  {!Array.isArray(data.trades) || data.trades.length === 0 ? (
    <p>No recent trades.</p>
  ) : (
    <table className="terminal-table">
      <thead>
        <tr>
          <th>Token</th>
          <th>Side</th>
          <th>Amount</th>
          <th>Entry Price</th>
          <th>Current Price</th>
          <th>PNL (USD)</th>
          <th>Program</th>
          <th>Time</th>
          <th>TxID</th>
        </tr>
      </thead>

      <tbody>
        {data.trades.slice(0, 20).map((tr: Trade) => {
          if (!tr || !tr.from || !tr.to) return null;

          const wallet = data.wallet;
          const timestamp = new Date(tr.time).toLocaleString();

          // Determine BUY or SELL
          const isBuy = tr.to.address === wallet;
          const isSell = tr.from.address === wallet;

          const token = isBuy ? tr.to.token : tr.from.token;
          const amount = isBuy ? tr.to.amount : tr.from.amount;

          // Entry price from SolanaTracker
          const entryPrice = tr.price.usd;

          // Find the token in current holdings to get current price
          const held = data.tokens.find((t) => t.mint === tr.to.token?.address || t.mint === tr.from.token?.address);
          const currentPrice = held?.priceUsd ?? tr.price.usd; // fallback: use entry price when priceUsd unavailable

          const pnlUsd = isBuy
            ? (currentPrice - entryPrice) * amount
            : (entryPrice - currentPrice) * amount;

          const side = isBuy ? "BUY" : "SELL";

          return (
            <tr key={tr.tx}>
              <td>{token.symbol}</td>

              <td className={side === "BUY" ? "text-[#E4B300] font-bold" : "text-red-400 font-bold"}>
                {side}
              </td>

              <td>{amount.toLocaleString()}</td>

              <td>${entryPrice.toFixed(10)}</td>

              <td>${currentPrice.toFixed(10)}</td>

              <td className={pnlUsd >= 0 ? "text-green-300" : "text-red-400"}>
                {pnlUsd >= 0 ? "+" : ""}
                {pnlUsd.toFixed(4)}
              </td>

              <td>{tr.program}</td>

              <td>{timestamp}</td>

              <td>
                <a href={`https://solscan.io/tx/${tr.tx}`} target="_blank">
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
