import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL!;
const BOT_WALLET = process.env.BOT_WALLET_ADDRESS!;
const API_KEY = "f6854be6-b87b-4b55-8447-d6e269bfe816";

const LAMPORTS_PER_SOL = 1_000_000_000;

// ----------------------------
// Types for PNL endpoint
// ----------------------------
interface TokenPnl {
  name?: string;
  realized?: number;
  unrealized?: number;
  total?: number;
  last_trade_time?: number;   // IMPORTANT
}

interface NormalizedPnl {
  mint: string;
  name: string;
  realized: number;
  unrealized: number;
  total: number;
  lastTrade: number;          // IMPORTANT
}

// ----------------------------
// Trades endpoint
// ----------------------------
interface RawTrade {
  tx: string;
  time?: number;
  timestamp?: number;
  price?: { usd?: number; usdc?: number; usdt?: number };
  volume?: { usd?: number };
  from?: { token?: { symbol?: string; mint?: string }; amount?: number };
  to?: { token?: { symbol?: string; mint?: string }; amount?: number };
}

interface NormalizedTrade {
  tx: string;
  time: number;
  mint: string;
  amount: number;
  priceUsd: number;
  side: "BUY" | "SELL";
}

export async function GET() {
  try {
    if (!RPC_URL || !BOT_WALLET) {
      return NextResponse.json(
        { error: "Missing RPC_URL or BOT_WALLET env" },
        { status: 500 }
      );
    }

    // ----------------------------------------------
    // 1) SOL BALANCE
    // ----------------------------------------------
    const connection = new Connection(RPC_URL, "confirmed");
    const pubkey = new PublicKey(BOT_WALLET);

    const lamports = await connection.getBalance(pubkey);
    const solBalance = lamports / LAMPORTS_PER_SOL;

    // ----------------------------------------------
    // 2) GET PNL DATA
    // ----------------------------------------------
    const pnlRes = await fetch(
      `https://data.solanatracker.io/pnl/${BOT_WALLET}`,
      {
        headers: { "x-api-key": API_KEY },
        cache: "no-store",
      }
    );

    let pnlData: { tokens: Record<string, TokenPnl>; summary?: any } = {
      tokens: {},
      summary: {},
    };

    if (pnlRes.ok) pnlData = await pnlRes.json();

    // Normalize PNL items
    let pnlArray: NormalizedPnl[] = Object.entries(pnlData.tokens || {}).map(
      ([mint, stats]) => ({
        mint,
        name: stats.name ?? "",
        realized: Number(stats.realized ?? 0),
        unrealized: Number(stats.unrealized ?? 0),
        total: Number(stats.total ?? 0),
        lastTrade: Number(stats.last_trade_time ?? 0), // << IMPORTANT
      })
    );

    // Sort newest first by last trade time
    pnlArray = pnlArray.sort((a, b) => b.lastTrade - a.lastTrade);

    // ----------------------------------------------
    // 3) RECENT TRADES
    // ----------------------------------------------
    const tradesRes = await fetch(
      `https://data.solanatracker.io/wallet/${BOT_WALLET}/trades?limit=25`,
      {
        headers: { "x-api-key": API_KEY },
        cache: "no-store",
      }
    );

    let trades: RawTrade[] = [];
    if (tradesRes.ok) {
      const raw = await tradesRes.json();
      trades = Array.isArray(raw) ? raw : raw.trades ?? [];
    }

    const lastTrades: NormalizedTrade[] = trades.map((t) => {
      const isBuy = t.from?.token?.symbol === "SOL";

      const time =
        t.time ?? (t.timestamp ? t.timestamp * 1000 : Date.now());

      const traded = isBuy ? t.to?.token : t.from?.token;

      const mint =
        traded?.mint ||
        traded?.symbol ||
        "UNKNOWN";

      const amount = Number(
        isBuy ? t.to?.amount : t.from?.amount
      ) || 0;

      const priceUsd =
        Number(t.volume?.usd) ||
        Number(t.price?.usd) ||
        Number(t.price?.usdc) ||
        Number(t.price?.usdt) ||
        0;

      return {
        tx: t.tx,
        time,
        mint,
        amount,
        priceUsd,
        side: isBuy ? "BUY" : "SELL",
      };
    });

    // ----------------------------------------------
    // FINAL RESPONSE
    // ----------------------------------------------
    return NextResponse.json({
      wallet: BOT_WALLET,
      solBalance,
      pnl: pnlArray,
      summary: pnlData.summary ?? {},
      lastTrades,
    });

  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: "Internal server error", message: err.message },
      { status: 500 }
    );
  }
}
