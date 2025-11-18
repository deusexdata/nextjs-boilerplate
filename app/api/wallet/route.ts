import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL!;
const BOT_WALLET = process.env.BOT_WALLET_ADDRESS!;
const LAMPORTS_PER_SOL = 1_000_000_000;

// Fetch token price from DexScreener
async function fetchDexPrice(mint: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/tokens/v1/solana/${mint}`,
      { cache: "no-store" }
    );

    if (!res.ok) return null;
    const json = await res.json();
    if (Array.isArray(json) && json.length > 0) {
      return Number(json[0]?.priceUsd || 0);
    }
    return null;
  } catch {
    return null;
  }
}

// LIVE API — NO STORAGE
export async function GET() {
  try {
    if (!RPC_URL || !BOT_WALLET) {
      return NextResponse.json(
        { error: "Missing env vars" },
        { status: 500 }
      );
    }

    const connection = new Connection(RPC_URL, "confirmed");
    const pubkey = new PublicKey(BOT_WALLET);

    // Get SOL balance
    const lamports = await connection.getBalance(pubkey);
    const solBalance = lamports / LAMPORTS_PER_SOL;

    // Get SPL tokens
    const tokenAccounts =
      await connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey(
          "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        ),
      });

    const rawTokens = tokenAccounts.value
      .map((acc) => {
        const inf
