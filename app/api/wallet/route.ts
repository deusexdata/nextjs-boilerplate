import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL!;
const BOT_WALLET = process.env.BOT_WALLET_ADDRESS!;
const API_KEY = "f6854be6-b87b-4b55-8447-d6e269bfe816";

const LAMPORTS_PER_SOL = 1_000_000_000;

// DexScreener price fetch
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
    console.log("Dex error:", e);
    return null;
  }
}

export async function GET() {
  try {
    if (!RPC_URL || !BOT_WALLET) {
      return NextResponse.json(
        { error: "Missing RPC or wallet envs" },
        { status: 500 }
      );
    }

    const connection = new Connection(RPC_URL, "confirmed");
    const pubkey = new PublicKey(BOT_WALLET);

    // ---- SOL BALANCE ----
    const lamports = await connection.getBalance(pubkey);
    const solBalance = lamports / LAMPORTS_PER_SOL;

    // ---- TOKENS ----
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
          valueUsd: priceUsd ? t.amount * priceUsd : 0,
        };
      })
    );

    const portfolioValue = tokens.reduce((sum, t) => sum + t.valueUsd, 0);

    // ---- TRADES FROM SOLANATRACKER ----
    const tradesRes = await fetch(
      `https://data.solanatracker.io/wallet/${BOT_WALLET}/trades?limit=50`,
      {
        headers: { "x-api-key": API_KEY },
        cache: "no-store",
      }
    );

    let trades: any[] = [];
    if (tradesRes.ok) {
      const arr = await tradesRes.json();

      if (Array.isArray(arr)) {
        trades = arr.map((t: any) => {
          const isBuy =
            t.from.token.mint === "So11111111111111111111111111111111111111112";

          return {
            tx: t.tx,
            time: t.timestamp,
            priceUsd: t.price?.usd ?? 0,
            mint: isBuy ? t.to.token.mint : t.from.token.mint,
            amount: isBuy ? t.to.amount : t.from.amount,
            side: isBuy ? "BUY" : "SELL",
          };
        });
      }
    }

    return NextResponse.json({
      wallet: BOT_WALLET,
      solBalance,
      tokens,
      portfolioValue,
      trades,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error", message: err.message },
      { status: 500 }
    );
  }
}
