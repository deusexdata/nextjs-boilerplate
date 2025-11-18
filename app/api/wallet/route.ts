import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL!;
const BOT_WALLET = process.env.BOT_WALLET_ADDRESS!;
const LAMPORTS_PER_SOL = 1_000_000_000;

async function fetchDexPrice(mint: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/tokens/v1/solana/${mint}`,
      { cache: "no-store" }
    );

    const json = await res.json();
    if (Array.isArray(json) && json.length > 0) {
      return Number(json[0]?.priceUsd || 0);
    }

    return null;
  } catch (e) {
    console.error("Dex error:", e);
    return null;
  }
}

export async function GET() {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const pubkey = new PublicKey(BOT_WALLET);

    // SOL balance
    const lamports = await connection.getBalance(pubkey);
    const solBalance = lamports / LAMPORTS_PER_SOL;

    // SPL tokens
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    });

    const rawTokens = tokenAccounts.value
      .map((acc) => {
        const info = acc.account.data.parsed.info;
        return {
          mint: info.mint,
          amount: Number(info.tokenAmount.uiAmount || 0),
        };
      })
      .filter((t) => t.amount > 0);

    const tokens = await Promise.all(
      rawTokens.map(async (t) => {
        const priceUsd = await fetchDexPrice(t.mint);
        return {
          mint: t.mint,
          amount: t.amount,
          priceUsd,
        };
      })
    );

    const portfolioValue = tokens.reduce((sum, t) => {
      return sum + (t.priceUsd ? t.priceUsd * t.amount : 0);
    }, 0);

    // -------- FIXED SOLANATRACKER API PARSING ----------
    const tRes = await fetch(
      `https://data.solanatracker.io/wallet/${BOT_WALLET}/trades`,
      {
        headers: { "x-api-key": "f6854be6-b87b-4b55-8447-d6e269bfe816" },
        cache: "no-store",
      }
    );

    let trades: any[] = [];
    if (tRes.ok) {
      const body = await tRes.json(); // body = { trades:[...] }
      trades = body.trades || [];
    }
    // ----------------------------------------------------

    return NextResponse.json({
      wallet: BOT_WALLET,
      solBalance,
      portfolioValue,
      tokens,
      trades: trades.slice(0, 25)
    });

  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: "Internal server error", message: err.message },
      { status: 500 }
    );
  }
}
