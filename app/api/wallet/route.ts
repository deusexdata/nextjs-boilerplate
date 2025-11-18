import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL!;
const BOT_WALLET = process.env.BOT_WALLET_ADDRESS!;
const API_KEY = "f6854be6-b87b-4b55-8447-d6e269bfe816";

const LAMPORTS_PER_SOL = 1_000_000_000;

// Fetch token price from DexScreener
async function fetchDexPrice(mint: string): Promise<number | null> {
  try {
    const url = `https://api.dexscreener.com/tokens/v1/solana/${mint}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;

    const json = await res.json();
    if (Array.isArray(json) && json.length > 0) {
      return Number(json[0]?.priceUsd || 0);
    }

    return null;
  } catch (e) {
    console.error("Dex price error:", e);
    return null;
  }
}

export async function GET() {
  try {
    if (!RPC_URL || !BOT_WALLET) {
      return NextResponse.json(
        { error: "Missing RPC or wallet env variables" },
        { status: 500 }
      );
    }

    // ────────── SOL BALANCE ──────────
    const connection = new Connection(RPC_URL, "confirmed");
    const pubkey = new PublicKey(BOT_WALLET);

    const lamports = await connection.getBalance(pubkey);
    const solBalance = lamports / LAMPORTS_PER_SOL;

    // ────────── TOKEN BALANCES ──────────
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      pubkey,
      { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
    );

    const rawTokens = tokenAccounts.value
      .map((acc) => {
        const info: any = acc.account.data.parsed.info;
        const amount = Number(info.tokenAmount.uiAmount || 0);
        const mint = info.mint;
        return { mint, amount };
      })
      .filter((t) => t.amount > 0);

    const tokens = await Promise.all(
      rawTokens.map(async (t) => {
        const priceUsd = await fetchDexPrice(t.mint);
        return {
          mint: t.mint,
          amount: t.amount,
          priceUsd,
          valueUsd: priceUsd ? priceUsd * t.amount : 0,
        };
      })
    );

    const portfolioValue = tokens.reduce((sum, t) => sum + t.valueUsd, 0);

    // ────────── TRADES VIA SOLANATRACKER ──────────
    const tRes = await fetch(
      `https://data.solanatracker.io/wallet/${BOT_WALLET}/trades`,
      {
        headers: { "x-api-key": API_KEY },
        cache: "no-store",
      }
    );

    let trades: any[] = [];
    if (tRes.ok) {
      const json = await tRes.json();
      if (Array.isArray(json)) {
        trades = json.map((t: any) => ({
          tx: t.tx,
          time: t.timestamp,
          priceUsd: t.price?.usd || 0,
          mint:
            t.from.token.symbol === "SOL"
              ? t.to.token.mint
              : t.from.token.mint,
          amount:
            t.from.token.symbol === "SOL" ? t.to.amount : t.from.amount,
          side: t.from.token.symbol === "SOL" ? "BUY" : "SELL",
        }));
      }
    }

    return NextResponse.json({
      wallet: BOT_WALLET,
      solBalance,
      tokens,
      portfolioValue,
      trades: trades.slice(0, 25),
    });
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: err.message,
      },
      { status: 500 }
    );
  }
}
