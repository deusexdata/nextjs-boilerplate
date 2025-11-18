import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { put, list } from "@vercel/blob";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const RPC_URL = process.env.SOLANA_RPC_URL!;
const BOT_WALLET = process.env.BOT_WALLET_ADDRESS!;
const LAMPORTS_PER_SOL = 1_000_000_000;

// Blob file locations
const TRADES_FILE = "deus/trades.json";
const FIFO_FILE = "deus/fifo.json";
const PNL_FILE = "deus/pnl.json";

// ─────────────────────────────────────────────
// READ FILE FROM BLOB — USING list() + fetch()
// ─────────────────────────────────────────────
async function loadJsonOrDefault<T>(path: string, defaultValue: T): Promise<T> {
  try {
    const files = await list({ prefix: path });

    if (!files.blobs.length) {
      return defaultValue;
    }

    // There should be exactly 1 file at this path
    const fileUrl = files.blobs[0].url;
    const res = await fetch(fileUrl);

    if (!res.ok) return defaultValue;

    return (await res.json()) as T;
  } catch (e) {
    console.error("Blob load error:", e);
    return defaultValue;
  }
}

// ─────────────────────────────────────────────
// WRITE FILE TO BLOB
// ─────────────────────────────────────────────
async function saveJson(path: string, data: any) {
  await put(path, JSON.stringify(data, null, 2), {
    access: "public",
    contentType: "application/json",
  });
}

// ─────────────────────────────────────────────
// FETCH PRICE FROM DEXSCREENER
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// FIFO ENGINE
// ─────────────────────────────────────────────
type FifoBatch = {
  amount: number;
  priceUsd: number;
  timestamp: number;
};

type FifoState = Record<string, FifoBatch[]>;

type PnlState = Record<
  string,
  {
    realizedPnlUsd: number;
    realizedPnlSol: number;
  }
>;

function applyNewTrade(trade: any, fifo: FifoState, pnl: PnlState) {
  const timestamp = new Date(trade.time).getTime();

  const isBuy =
    trade.from.token.symbol === "SOL" &&
    trade.to.token.symbol !== "SOL";

  const token = isBuy ? trade.to.token : trade.from.token;
  const mint = token.mint;
  const amount = isBuy ? trade.to.amount : trade.from.amount;
  const priceUsd = trade.price.usd;

  if (!fifo[mint]) fifo[mint] = [];
  if (!pnl[mint]) pnl[mint] = { realizedPnlUsd: 0, realizedPnlSol: 0 };

  // BUY → add batch
  if (isBuy) {
    fifo[mint].push({
      amount,
      priceUsd,
      timestamp,
    });
    return;
  }

  // SELL → apply FIFO
  let remaining = amount;

  while (remaining > 0 && fifo[mint].length > 0) {
    const batch = fifo[mint][0];

    if (batch.amount > remaining) {
      const cost = remaining * batch.priceUsd;
      const revenue = remaining * priceUsd;
      pnl[mint].realizedPnlUsd += revenue - cost;
      batch.amount -= remaining;
      remaining = 0;
    } else {
      const cost = batch.amount * batch.priceUsd;
      const revenue = batch.amount * priceUsd;
      pnl[mint].realizedPnlUsd += revenue - cost;

      remaining -= batch.amount;
      fifo[mint].shift();
    }
  }
}

// ─────────────────────────────────────────────
// API ROUTE HANDLER
// ─────────────────────────────────────────────
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

    // Load saved FIFO, PNL, trades
    const fifo: FifoState = await loadJsonOrDefault(FIFO_FILE, {});
    const pnl: PnlState = await loadJsonOrDefault(PNL_FILE, {});
    const savedTrades: any[] = await loadJsonOrDefault(TRADES_FILE, []);

    const known = new Set(savedTrades.map((t) => t.tx));

    // Fetch SolanaTracker trades
    const st = await fetch(
      `https://data.solanatracker.io/wallet/${BOT_WALLET}/trades`,
      {
        headers: {
          "x-api-key": "f6854be6-b87b-4b55-8447-d6e269bfe816",
        },
        cache: "no-store",
      }
    );

    let latestTrades: any[] = [];
    if (st.ok) latestTrades = await st.json();

    // Apply newly found trades
    for (const tr of latestTrades) {
      if (!known.has(tr.tx)) {
        applyNewTrade(tr, fifo, pnl);
        savedTrades.push(tr);
      }
    }

    // Save updated storage
    await saveJson(FIFO_FILE, fifo);
    await saveJson(PNL_FILE, pnl);
    await saveJson(TRADES_FILE, savedTrades);

    // Fetch SOL balance
    const lamports = await connection.getBalance(pubkey);
    const solBalance = lamports / LAMPORTS_PER_SOL;

    // SPL balances
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
        const amount = info.tokenAmount.uiAmount || 0;
        const mint = info.mint;
        return { mint, amount };
      })
      .filter((t) => t.amount > 0);

    const tokens = await Promise.all(
      rawTokens.map(async (t) => ({
        ...t,
        priceUsd: await fetchDexPrice(t.mint),
      }))
    );

    const portfolioValue = tokens.reduce(
      (sum, t) =>
        sum + (t.priceUsd ? t.priceUsd * t.amount : 0),
      0
    );

    return NextResponse.json({
      wallet: BOT_WALLET,
      solBalance,
      tokens,
      portfolioValue,
      trades: latestTrades.slice(0, 25),
      fifo,
      pnl,
      totalRealizedPnlUsd: Object.values(pnl).reduce(
        (a: number, b: any) => a + b.realizedPnlUsd,
        0
      ),
    });
  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
