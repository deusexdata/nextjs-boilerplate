import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL!;
const BOT_WALLET = process.env.BOT_WALLET_ADDRESS!;
const LAMPORTS_PER_SOL = 1_000_000_000;

// DexScreener Price Fetch
async function fetchDexscreenerPriceUsd(mint: string): Promise<number | null> {
  try {
    const url = `https://api.dexscreener.com/tokens/v1/solana/${mint}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) return null;

    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      const priceUsd = data[0]?.priceUsd;
      return priceUsd ? Number(priceUsd) : null;
    }
    return null;
  } catch (e) {
    console.error("DexScreener error:", e);
    return null;
  }
}

export async function GET() {
  try {
    if (!RPC_URL || !BOT_WALLET) {
      return NextResponse.json(
        { error: "Missing SOLANA_RPC_URL or BOT_WALLET_ADDRESS" },
        { status: 500 }
      );
    }

    const connection = new Connection(RPC_URL, "confirmed");
    const pubkey = new PublicKey(BOT_WALLET);

    // 1) SOL Balance
    const lamports = await connection.getBalance(pubkey);
    const solBalance = lamports / LAMPORTS_PER_SOL;

    // 2) SPL Token Balances
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      pubkey,
      {
        programId: new PublicKey(
          "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        ),
      }
    );

    const rawTokens = tokenAccounts.value
      .map((acc) => {
        const info: any = acc.account.data.parsed.info;
        const amount = info.tokenAmount.uiAmount as number | null;
        const mint = info.mint as string;
        return { mint, amount: amount || 0 };
      })
      .filter((t) => t.amount > 0);

    // Fetch DexScreener prices
    const tokens = await Promise.all(
      rawTokens.map(async (t) => {
        const priceUsd = await fetchDexscreenerPriceUsd(t.mint);
        return {
          ...t,
          priceUsd,
        };
      })
    );

    // 3) FETCH TRADES FROM SOLANATRACKER
    const stRes = await fetch(
      `https://data.solanatracker.io/wallet/${BOT_WALLET}/trades`,
      {
        headers: {
          "x-api-key": "f6854be6-b87b-4b55-8447-d6e269bfe816",
          accept: "application/json",
        },
        cache: "no-store",
      }
    );

    let stTrades = [];
    if (stRes.ok) {
      stTrades = await stRes.json();
    } else {
      console.error("SolanaTracker error:", await stRes.text());
    }

    return NextResponse.json({
      wallet: BOT_WALLET,
      solBalance,
      tokens,
      recentTrades: stTrades,
    });
  } catch (err) {
    console.error("API Wallet Error:", err);
    return NextResponse.json(
      { error: "Failed to load wallet data" },
      { status: 500 }
    );
  }
}
