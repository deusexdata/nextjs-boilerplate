export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL!;
const BOT_WALLET = process.env.BOT_WALLET_ADDRESS!;
const API_KEY = "f6854be6-b87b-4b55-8447-d6e269bfe816";
const LAMPORTS_PER_SOL = 1_000_000_000;

// Fetch price from DexScreener
async function fetchDexPrice(mint: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/tokens/v1/solana/${mint}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      console.error("DexScreener error:", res.status, res.statusText);
      return null;
    }

    const json = await res.json();
    if (Array.isArray(json) && json.length > 0) {
      return Number(json[0]?.priceUsd || 0);
    }

    return null;
  } catch (e) {
    console.error("DexScreener fetch error:", e);
    return null;
  }
}

export async function GET() {
  try {
    if (!RPC_URL || !BOT_WALLET) {
      return NextResponse.json(
        { error: "Missing RPC or Wallet env vars" },
        { status: 500 }
      );
    }

    const connection = new Connection(RPC_URL, "confirmed");
    const pubkey = new PublicKey(BOT_WALLET);

    // SOL balance
    const lamports = await connection.getBalance(pubkey);
    const solBalance = lamports / LAMPORTS_PER_SOL;

    // SPL token balances
    const tokenAccounts =
      await connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey(
          "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        ),
      });

    const rawTokens = tokenAccounts.value
      .map((acc) => {
        const info: any = acc.account.data.parsed.info;
        const amount = Number(info.tokenAmount.uiAmount || 0);
        const mint = String(info.mint);
        return { mint, amount };
      })
      .filter((t) => t.amount > 0);

    const tokens = await Promise.all(
      rawTokens.map(async (t) => ({
        mint: t.mint,
        amount: t.amount,
        priceUsd: await fetchDexPrice(t.mint),
      }))
    );

    // Portfolio total USD
    const portfolioValue = tokens.reduce(
      (sum, t) =>
        t.priceUsd ? sum + t.priceUsd * t.amount : sum,
      0
    );

    // Live trades from SolanaTracker
    const resp = await fetch(
      `https://data.solanatracker.io/wallet/${BOT_WALLET}/trades`,
      {
        headers: { "x-api-key": API_KEY, accept: "application/json" },
        cache: "no-store",
      }
    );

    let trades: any[] = [];
    if (resp.ok) {
      trades = await resp.json();
    } else {
      console.error("SolanaTracker error:", resp.status, resp.statusText);
    }

    // Return a SAFE payload with all required fields
    return NextResponse.json({
      wallet: BOT_WALLET,
      solBalance,
      tokens,
      portfolioValue,
      trades: trades.slice(0, 25),

      // Placeholder fields to avoid frontend crash
      totalRealizedPnlUsd: 0,
      pnl: {},
      fifo: {},
    });
  } catch (err: any) {
    console.error("Wallet API Error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: err?.message,
      },
      { status: 500 }
    );
  }
}
