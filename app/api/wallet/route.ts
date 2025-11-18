import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL!;
const BOT_WALLET = process.env.BOT_WALLET_ADDRESS!;
const API_KEY = "f6854be6-b87b-4b55-8447-d6e269bfe816";

const LAMPORTS_PER_SOL = 1_000_000_000;

export async function GET() {
  try {
    if (!RPC_URL || !BOT_WALLET) {
      return NextResponse.json(
        { error: "Missing environment variables" },
        { status: 500 }
      );
    }

    const connection = new Connection(RPC_URL, "confirmed");
    const pubkey = new PublicKey(BOT_WALLET);

    // ---------------------------------------------------------
    // 1) SOL BALANCE
    // ---------------------------------------------------------
    const lamports = await connection.getBalance(pubkey);
    const solBalance = lamports / LAMPORTS_PER_SOL;

    // ---------------------------------------------------------
    // 2) PNL ENDPOINT
    // ---------------------------------------------------------
    const pnlRes = await fetch(
      `https://data.solanatracker.io/pnl/${BOT_WALLET}`,
      {
        headers: { "x-api-key": API_KEY },
        cache: "no-store",
      }
    );

    let pnlData: any = { tokens: {}, summary: {} };

    if (pnlRes.ok) {
      pnlData = await pnlRes.json();
    }

    // Convert token PNL object → array
    const pnlArray = Object.entries(pnlData.tokens || {}).map(
      ([mint, stats]: any) => ({
        mint,
        name: stats.name ?? "",
        realized: Number(stats.realized ?? 0),
        unrealized: Number(stats.unrealized ?? 0),
        total: Number(stats.total ?? 0),
      })
    );

    // ---------------------------------------------------------
    // 3) RECENT TRADES ENDPOINT
    // ---------------------------------------------------------
    const tradesRes = await fetch(
      `https://data.solanatracker.io/wallet/${BOT_WALLET}/trades?limit=25`,
      {
        headers: { "x-api-key": API_KEY },
        cache: "no-store",
      }
    );

    let trades: any[] = [];

    if (tradesRes.ok) {
      trades = await tradesRes.json();
      if (!Array.isArray(trades)) trades = trades.trades || [];
    }

    // Normalize trades for frontend
    const lastTrades = trades.map((t: any) => ({
      tx: t.tx,
      time: t.timestamp,
      mint:
        t.to?.token?.mint ||
        t.from?.token?.mint ||
        t.to?.token?.symbol ||
        t.from?.token?.symbol ||
        "UNKNOWN",
      amount: Number(
        t.from?.token?.symbol === "SOL" ? t.to?.amount : t.from?.amount
      ),
      priceUsd: Number(t.price?.usd ?? 0),
      side: t.from?.token?.symbol === "SOL" ? "BUY" : "SELL",
    }));

    // ---------------------------------------------------------
    // SEND FINAL RESPONSE
    // ---------------------------------------------------------
    return NextResponse.json({
      wallet: BOT_WALLET,
      solBalance,
      pnl: pnlArray,
      summary: pnlData.summary || {},
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
