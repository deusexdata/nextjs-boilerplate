"use client";
import { useEffect, useState } from "react";

export default function Home() {
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
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center text-center terminal-glow">
        Initializing Deus Terminal…
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 space-y-12 terminal-glow">
      
      {/* HEADER */}
      <h1 className="text-4xl mb-2 terminal-glow">
        ► DEUS VISION :: ON-CHAIN INTELLIGENCE TERMINAL
      </h1>
      <p className="text-md text-[#E4B300]">
        Monitoring Wallet: <span className="font-mono">{data.wallet}</span>
      </p>

      {/* PORTFOLIO VALUE */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ PORTFOLIO VALUE ]</h2>
        <p className="text-3xl">
          ${(data.portfolioValue || 0).toFixed(2)}
        </p>
      </section>

      {/* SOL BALANCE */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ SOL BALANCE ]</h2>
        <p className="text-2xl">
          {(data.solBalance || 0).toFixed(4)} SOL
        </p>
      </section>

      {/* TOKENS */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ TOKEN HOLDINGS ]</h2>

        {data.tokens?.length === 0 ? (
          <p>No SPL tokens detected.</p>
        ) : (
          <table className="terminal-table">
            <thead>
              <tr>
                <th>Token Mint</th>
                <th>Amount</th>
                <th>Price (USD)</th>
                <th>Value (USD)</th>
              </tr>
            </thead>
            <tbody>
              {data.tokens.map((t: any) => (
                <tr key={t.mint}>
                  <td className="font-mono">{t.mint}</td>
                  <td>{t.amount}</td>
                  <td>{t.priceUsd ? t.priceUsd.toFixed(4) : "N/A"}</td>
                  <td>
                    {t.priceUsd
                      ? (t.priceUsd * t.amount).toFixed(2)
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* TRADES */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ RECENT TRADES ]</h2>

        {data.trades?.length === 0 ? (
          <p>No recent trades.</p>
        ) : (
          <table className="terminal-table">
            <thead>
              <tr>
                <th>TX</th>
                <th>Time</th>
                <th>Type</th>
                <th>Token</th>
                <th>Amount</th>
                <th>Price (USD)</th>
              </tr>
            </thead>
            <tbody>
              {data.trades.map((t: any, i: number) => {
                const isBuy = t.type === "buy" || t.side === "buy";
                return (
                  <tr key={i}>
                    <td>
                      <a
                        href={`https://solscan.io/tx/${t.signature}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t.signature?.slice(0, 12)}…
                      </a>
                    </td>

                    <td>{new Date(t.timestamp).toLocaleString()}</td>

                    <td className={isBuy ? "text-green-300" : "text-red-400"}>
                      {isBuy ? "BUY" : "SELL"}
                    </td>

                    <td className="font-mono">{t.mint}</td>

                    <td>{t.amount}</td>

                    <td>{t.priceUsd ? t.priceUsd.toFixed(4) : "N/A"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
