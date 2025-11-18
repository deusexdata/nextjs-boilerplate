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

      {/* TOTAL PNL */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ TOTAL REALIZED PNL ]</h2>
        <p
          className={
            data.totalRealizedPnlUsd >= 0 ? "text-green-400 text-3xl" : "text-red-400 text-3xl"
          }
        >
          {data.totalRealizedPnlUsd >= 0 ? "+" : ""}
          {data.totalRealizedPnlUsd.toFixed(2)} USD
        </p>
      </section>

      {/* SOL BALANCE */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ SOL BALANCE ]</h2>
        <p className="text-2xl">{data.solBalance.toFixed(4)} SOL</p>
      </section>

      {/* TOKEN BALANCES */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ TOKEN HOLDINGS ]</h2>

        {data.tokens.length === 0 ? (
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

      {/* REALIZED PNL PER TOKEN */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ REALIZED PNL BY TOKEN ]</h2>

        <table className="terminal-table">
          <thead>
            <tr>
              <th>Token Mint</th>
              <th>Realized PNL (USD)</th>
            </tr>
          </thead>

          <tbody>
            {Object.entries(data.pnl).map(([mint, values]: any) => (
              <tr key={mint}>
                <td className="font-mono">{mint}</td>
                <td
                  className={
                    values.realizedPnlUsd >= 0 ? "text-green-300" : "text-red-400"
                  }
                >
                  {values.realizedPnlUsd >= 0 ? "+" : ""}
                  {values.realizedPnlUsd.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* FIFO INVENTORY */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ FIFO INVENTORY (UNSOLD BATCHES) ]</h2>

        {Object.keys(data.fifo).length === 0 ? (
          <p>No remaining inventory.</p>
        ) : (
          <table className="terminal-table">
            <thead>
              <tr>
                <th>Token Mint</th>
                <th>Batches</th>
              </tr>
            </thead>

            <tbody>
              {Object.entries(data.fifo).map(([mint, batches]: any) => (
                <tr key={mint}>
                  <td className="font-mono">{mint}</td>
                  <td>
                    {batches.length} batches
                    <br />
                    {batches.map((b: any, i: number) => (
                      <div key={i} className="text-xs text-[#E4B300cc]">
                        {b.amount} @ ${b.priceUsd} on{" "}
                        {new Date(b.timestamp).toLocaleString()}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* RECENT TRADES */}
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
                <th>Type</th>
                <th>Token</th>
                <th>Amount</th>
                <th>Price (USD)</th>
              </tr>
            </thead>

            <tbody>
              {data.trades.map((t: any, i: number) => (
                <tr key={i}>
                  <td>
                    <a
                      href={`https://solscan.io/tx/${t.tx}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.tx.slice(0, 12)}…
                    </a>
                  </td>

                  <td>{new Date(t.time).toLocaleString()}</td>

                  <td className={t.from.token.symbol === "SOL" ? "text-green-300" : "text-red-400"}>
                    {t.from.token.symbol === "SOL" ? "BUY" : "SELL"}
                  </td>

                  <td>{t.from.token.symbol === "SOL" ? t.to.token.mint : t.from.token.mint}</td>

                  <td>{t.from.token.symbol === "SOL" ? t.to.amount : t.from.amount}</td>

                  <td>{t.price.usd.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
