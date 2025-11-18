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
}

interface NormalizedPnl {
  mint: string;
  name: string;
  realized: number;
  unrealized: number;
  total: number;
}

// ----------------------------
// Types for Trades endpoint
// ----------------------------
interface RawTrade {
  tx: string;
  time?: number; // milliseconds since epoch (SolanaTracker)
  timestamp?: number; // optional seconds-based timestamp (fallback)
  price?: { usd?: number; usdc?: number; usdt?: number };
  volume?: { usd?: number };
  from?: { token?: { symbol?: string; mint?: string }; amount?: number };
  to?: { token?: { symbol?: string; mint?: string }; amount?: number };
}

interface NormalizedTrade {
  tx: string;
  time: number; // ms
  mint: string;
  amount: number;
  priceUsd: number; // we use this as VALUE in USD (from volume.usd)
  side: "BUY" | "SELL";
}

export async function GET() {
  try {
    if (!RPC_URL || !BOT_WALLET) {
      return NextResponse.json(
        { error: "Missing environment variables" },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------
    // 1) SOL BALANCE
    // ------------------------------------------------------------------
    const connection = new Connection(RPC_URL, "confirmed");
    const pubkey = new PublicKey(BOT_WALLET);

    const lamports = await connection.getBalance(pubkey);
    const solBalance = lamports / LAMPORTS_PER_SOL;

    // ------------------------------------------------------------------
    // 2) PNL ENDPOINT  (https://data.solanatracker.io/pnl/{wallet})
    // ------------------------------------------------------------------
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

    if (pnlRes.ok) {
      pnlData = await pnlRes.json();
    }

    const pnlArray: NormalizedPnl[] = Object.entries(
      pnlData.tokens || {}
    ).map(([mint, stats]) => ({
      mint,
      name: stats.name ?? "",
      realized: Number(stats.realized ?? 0),
      unrealized: Number(stats.unrealized ?? 0),
      total: Number(stats.total ?? 0),
    }));

    // ------------------------------------------------------------------
    // 3) TRADES ENDPOINT (https://data.solanatracker.io/wallet/{wallet}/trades)
    // ------------------------------------------------------------------
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
      trades = Array.isArray(raw) ? (raw as RawTrade[]) : (raw.trades ?? []);
    }

    const lastTrades: NormalizedTrade[] = trades.map((t) => {
      const isBuy = t.from?.token?.symbol === "SOL";

      // time from 'time' (ms) or fallback to 'timestamp' (sec → ms)
      const time =
        t.time ??
        (typeof t.timestamp === "number" ? t.timestamp * 1000 : 0);

      // mint: prefer actual mint address, otherwise symbol
      const mint =
        t.to?.token?.mint ||
        t.from?.token?.mint ||
        t.to?.token?.symbol ||
        t.from?.token?.symbol ||
        "UNKNOWN";

      // amount: if BUY, we receive token (t.to), if SELL, we send token (t.from)
      const amount = Number(isBuy ? t.to?.amount : t.from?.amount) || 0;

      // VALUE in USD for this trade:
      // 1) use volume.usd if present
      // 2) else price.usd if present (still per-token; front will show it)
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

    // ------------------------------------------------------------------
    // 4) RESPONSE
    // ------------------------------------------------------------------
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
