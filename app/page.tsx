"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [positions, setPositions] = useState<any>({});

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/wallet");
      const json = await res.json();
      setData(json);

      // --- PNL (placeholder using current prices) ---
      if (json.tokens && json.trades) {
        const pos: any = {};

        // initialize base positions
        json.tokens.forEach((t: any) => {
          pos[t.mint] = {
            mint: t.mint,
            amount: t.amount,
            priceUsd: t.priceUsd,
            avgPrice: 0,
            costBasis: 0,
            valueUsd: (t.priceUsd || 0) * t.amount,
            pnlUsd: 0,
          };
        });

        // calculate cost basis from "virtual" avg price
        json.trades.forEach((tr: any) => {
          if (tr.side === "BUY") {
            const priceAtBuy = pos[tr.mint]?.priceUsd || 0;
            if (priceAtBuy > 0) {
              pos[tr.mint].costBasis += tr.amount * priceAtBuy;
            }
          }
        });

        Object.keys(pos).forEach((mint) => {
          const p = pos[mint];

          if (p.amount > 0 && p.costBasis > 0) {
            p.avgPrice = p.costBasis / p.amount;
            p.pnlUsd = p.valueUsd - p.costBasis;
          } else {
            p.avgPrice = 0;
            p.pnlUsd = 0;
          }
        });

        setPositions(pos);
      }
    };

    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, []);

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center text-center terminal-glow">
        Initializing Deus Terminal…
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 space-y-12 terminal-glow">

      {/* HEADER */}
      <h1 className="text-4xl mb-2 terminal-glow">► DEUS VISION :: ON-CHAIN INTELLIGENCE TERMINAL</h1>
      <p className="text-md text-[#00ffaacc]">
        Monitoring Wallet: <span className="font-mono">{data.wallet}</span>
      </p>

      {/* SOL BALANCE */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ SOL BALANCE ]</h2>
        <p className="text-2xl">{data.solBalance.toFixed(4)} SOL</p>
      </section>

      {/* POSITIONS & PNL */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ POSITIONS & PNL ]</h2>

        <table className="terminal-table">
          <thead>
            <tr>
              <th>Token</th>
              <th>Amount</th>
              <th>Avg Price</th>
              <th>Cost Basis</th>
              <th>Value (USD)</th>
              <th>PNL (USD)</th>
            </tr>
          </thead>

          <tbody>
            {Object.values(positions).map((p: any) => (
              <tr key={p.mint}>
                <td className="font-mono">{p.mint}</td>
                <td>{p.amount}</td>
                <td>${p.avgPrice?.toFixed(6)}</td>
                <td>${p.costBasis?.toFixed(2)}</td>
                <td>${p.valueUsd?.toFixed(2)}</td>
                <td className={p.pnlUsd >= 0 ? "text-green-300" : "text-red-400"}>
                  {p.pnlUsd >= 0 ? "+" : ""}
                  {p.pnlUsd.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* TOKEN BALANCES */}
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
              </tr>
            </thead>
            <tbody>
              {data.tokens.map((t: any) => (
                <tr key={t.mint}>
                  <td className="font-mono">{t.mint}</td>
                  <td>{t.amount}</td>
                  <td>{t.priceUsd ? `$${t.priceUsd}` : "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* TRADES */}
      <section className="terminal-box">
        <h2 className="terminal-title">[ RECENT TOKEN MOVEMENT ]</h2>

        {data.trades.length === 0 ? (
          <p>No recent trades detected.</p>
        ) : (
          <div className="space-y-4">
            {data.trades.map((tr: any, i: number) => (
              <div key={i} className="p-4 border border-[#00ff9d33] rounded">
                <p>
                  <span className={tr.side === "BUY" ? "text-green-300 font-bold" : "text-red-400 font-bold"}>
                    {tr.side}
                  </span>{" "}
                  {tr.amount} of {tr.mint}
                </p>

                <p className="text-sm text-[#00ffaacc]">{tr.time}</p>

                <a href={`https://solscan.io/tx/${tr.signature}`} target="_blank">
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
