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

    // ---- SOL BALANCE ----
    const lamports = await connection.getBalance(pubkey);
    const solBalance = lamports / LAMPORTS_PER_SOL;

    // ---- SOLANATRACKER TRADES ----
    const tradeRes = await fetch(
      `https://data.solanatracker.io/wallet/${BOT_WALLET}/trades?limit=200`,
      {
        headers: { "x-api-key": API_KEY },
        cache: "no-store",
      }
    );

    let trades: any[] = [];
    if (tradeRes.ok) {
      const body = await tradeRes.json();
      trades = Array.isArray(body) ? body : body.trades || [];
    }

    // ---- PNL CALCULATION ----
    const pnlMap: Record<string, any> = {};

    for (const t of trades) {
      const mint =
        t.to.token?.mint ||
        t.from.token?.mint ||
        t.to.token?.symbol ||
        t.from.token?.symbol ||
        "UNKNOWN";

      if (!pnlMap[mint]) {
        pnlMap[mint] = {
          mint,
          name: t.to.token?.name || t.from.token?.name || "",
          image: t.to.token?.image || t.from.token?.image || "",
          buys: 0,
          sells: 0,
          buyUsd: 0,
          sellUsd: 0,
          realizedPnlUsd: 0,
        };
      }

      const row = pnlMap[mint];

      const usd = Number(t.volume?.usd || 0);

      const walletIsBuyer =
        t.to.address === BOT_WALLET ||
        t.to.owner === BOT_WALLET ||
        t.from.token.symbol === "SOL";

      const walletIsSeller =
        t.from.address === BOT_WALLET ||
        t.from.owner === BOT_WALLET;

      if (walletIsBuyer) {
        row.buys++;
        row.buyUsd += usd;
      }

      if (walletIsSeller) {
        row.sells++;
        row.sellUsd += usd;
      }

      row.realizedPnlUsd = Number((row.sellUsd - row.buyUsd).toFixed(4));
    }

    const pnlArray = Object.values(pnlMap);

    // Simplify trades for frontend
    const lastTrades = trades.slice(0, 25).map((t: any) => ({
      tx: t.tx,
      time: t.timestamp,
      mint:
        t.to.token?.mint ||
        t.from.token?.mint ||
        t.to.token?.symbol ||
        t.from.token?.symbol,
      side: t.from.token.symbol === "SOL" ? "BUY" : "SELL",
      amount:
        t.from.token.symbol === "SOL" ? t.to.amount : t.from.amount,
      priceUsd: t.price?.usd || 0,
    }));

    return NextResponse.json({
      wallet: BOT_WALLET,
      solBalance,
      pnl: pnlArray,
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
