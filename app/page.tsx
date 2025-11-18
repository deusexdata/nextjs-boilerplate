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
      console.error("Frontend error:", e);
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
      <main className="min-h-screen flex items-center justify-center text-center">
        Initializing Deus Terminal…
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 space-y-12">

      {/* HEADER */}
      <h1 className="text-4xl mb-2">
        ► DEUS VISION :: ON-CHAIN INTELLIGENCE TERMINAL
      </h1>
      <p className="text-md text-[#E4B300]">
        Monitoring Wallet: <span className="font-mono">{data.wallet}</span>
      </p>

      {/* PORTFOLIO VALUE */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ TOTAL PORTFOLIO VALUE ]</h2>
        <p className="text-3xl">
          ${(data.portfolioValue ?? 0).toFixed(2)}
        </p>
      </section>

      {/* SOL BALANCE */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ SOL BALANCE ]</h2>
        <p className="text-2xl">
          {(data.solBalance ?? 0).toFixed(4)} SOL
        </p>
      </section>

      {/* TOKEN HOLDINGS */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ TOKEN HOLDINGS ]</h2>
        {data.tokens.length === 0 ? (
          <p>No tokens detected.</p>
        ) : (
          <table className="terminal-table">
            <thead>
              <tr>
                <th>Mint</th>
                <th>Amount</th>
                <th>Price</th>
                <th>Value</th>
              </tr>
            </thead>

            <tbody>
              {data.tokens.map((t: any) => (
                <tr key={t.mint}>
                  <td className="font-mono">{t.mint}</td>
                  <td>{t.amount}</td>
                  <td>{t.priceUsd ? t.priceUsd.toFixed(4) : "N/A"}</td>
                  <td>${t.valueUsd.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* TRADES */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ RECENT TRADES ]</h2>

        {data.trades.length === 0 ? (
          <p>No recent trades.</p>
        ) : (
          <table className="terminal-table">
            <thead>
              <tr>
                <th>TX</th>
                <th>Time</th>
                <th>Side</th>
                <th>Mint</th>
                <th>Amount</th>
                <th>Price</th>
              </tr>
            </thead>

            <tbody>
              {data.trades.map((t: any, i: number) => (
                <tr key={i}>
                  <td>
                    <a
                      href={`https://solscan.io/tx/${t.tx}`}
                      target="_blank"
                    >
                      {t.tx.slice(0, 12)}…
                    </a>
                  </td>

                  <td>{new Date(t.time).toLocaleString()}</td>

                  <td className={t.side === "BUY" ? "text-green-400" : "text-red-400"}>
                    {t.side}
                  </td>

                  <td>{t.mint}</td>

                  <td>{t.amount}</td>

                  <td>${(t.priceUsd ?? 0).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
