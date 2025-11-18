import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { put, list, get } from "@vercel/blob";

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
// HELPERS — Load or Create File
// ─────────────────────────────────────────────
async function loadJsonOrDefault<T>(path: string, defaultValue: T): Promise<T> {
  try {
    const file = await get(path);
    if (!file) return defaultValue;
    const text = await file.text();
    return JSON.parse(text);
  } catch {
    return defaultValue;
  }
}

async function saveJson(path: string, data: any) {
  await put(path, JSON.stringify(data, null, 2), {
    access: "public",
    contentType: "application/json",
  });
}

// ─────────────────────────────────────────────
// DEXSCREENER PRICE
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
      return Number(json[0].priceUsd || 0);
    }
    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// TRUE FIFO ENGINE
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

function applyNewTradeToFIFO(
  trade: any,
  fifo: FifoState,
  pnl: PnlState
) {
  const time = new Date(trade.time).getTime();

  // Detect BUY or SELL
  const isBuy =
    trade.from.token.symbol === "SOL" &&
    trade.to.token.symbol !== "SOL";

  const token = isBuy ? trade.to.token : trade.from.token;
  const amount = isBuy ? trade.to.amount : trade.from.amount;
  const priceUsd = trade.price.usd;
  const priceSol = trade.price.sol;
  const mint = token.mint;

  if (!fifo[mint]) fifo[mint] = [];
  if (!pnl[mint]) pnl[mint] = { realizedPnlUsd: 0, realizedPnlSol: 0 };

  // BUY → push onto FIFO
  if (isBuy) {
    fifo[mint].push({
      amount,
      priceUsd,
      timestamp: time,
    });
    return;
  }

  // SELL → drain FIFO
  let remainingToSell = amount;

  while (remainingToSell > 0 && fifo[mint].length > 0) {
    const batch = fifo[mint][0];

    if (batch.amount > remainingToSell) {
      // Partial consume
      const cost = remainingToSell * batch.priceUsd;
      const revenue = remainingToSell * priceUsd;
      const profitUsd = revenue - cost;

      pnl[mint].realizedPnlUsd += profitUsd;
      pnl[mint].realizedPnlSol += profitUsd / priceUsd;

      batch.amount -= remainingToSell;
      remainingToSell = 0;
    } else {
      // Full consume batch
      const cost = batch.amount * batch.priceUsd;
      const revenue = batch.amount * priceUsd;
      const profitUsd = revenue - cost;

      pnl[mint].realizedPnlUsd += profitUsd;
      pnl[mint].realizedPnlSol += profitUsd / priceUsd;

      remainingToSell -= batch.amount;
      fifo[mint].shift(); // remove batch
    }
  }
}

// ─────────────────────────────────────────────
// MAIN API HANDLER
// ─────────────────────────────────────────────
export async function GET() {
  try {
    if (!RPC_URL || !BOT_WALLET) {
      return NextResponse.json(
        { error: "Missing env vars" },
        { status: 500 }
      );
    }

    // Connect RPC
    const connection = new Connection(RPC_URL, "confirmed");
    const pubkey = new PublicKey(BOT_WALLET);

    // ───────────────────────
    // Load saved FIFO & PNL
    // ───────────────────────
    const fifo: FifoState = await loadJsonOrDefault(FIFO_FILE, {});
    const pnl: PnlState = await loadJsonOrDefault(PNL_FILE, {});
    const savedTrades: any[] = await loadJsonOrDefault(TRADES_FILE, []);

    // Track known signatures to detect new trades
    const knownSigs = new Set(savedTrades.map((t) => t.tx));

    // ─────────────────────────────
    // Fetch latest trades (SolanaTracker)
    // ─────────────────────────────
    const st = await fetch(
      `https://data.solanatracker.io/wallet/${BOT_WALLET}/trades`,
      {
        headers: {
          "x-api-key": "f6854be6-b87b-4b55-8447-d6e269bfe816",
          accept: "application/json",
        },
        cache: "no-store",
      }
    );

    let latestTrades: any[] = [];
    if (st.ok) latestTrades = await st.json();

    // ────────────────────────────
    // FIFO: Apply ONLY new trades
    // ────────────────────────────
    for (const tr of latestTrades) {
      if (knownSigs.has(tr.tx)) continue;
      applyNewTradeToFIFO(tr, fifo, pnl);
      savedTrades.push(tr);
    }

    // Save updated state
    await saveJson(FIFO_FILE, fifo);
    await saveJson(PNL_FILE, pnl);
    await saveJson(TRADES_FILE, savedTrades);

    // ─────────────────────────────
    // Get SOL Balance
    // ─────────────────────────────
    const lamports = await connection.getBalance(pubkey);
    const solBalance = lamports / LAMPORTS_PER_SOL;

    // ─────────────────────────────
    // Get SPL Token Balances
    // ─────────────────────────────
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

    // Fetch USD prices
    const tokens = await Promise.all(
      rawTokens.map(async (t) => ({
        ...t,
        priceUsd: await fetchDexPrice(t.mint),
      }))
    );

    // Compute portfolio value
    const portfolioValue = tokens.reduce((sum, t) => {
      return sum + (t.priceUsd ? t.priceUsd * t.amount : 0);
    }, 0);

    return NextResponse.json({
      wallet: BOT_WALLET,
      solBalance,
      tokens,
      portfolioValue,
      trades: latestTrades.slice(0, 25),
      fifo,
      pnl,
      totalRealizedPnlUsd: Object.values(pnl).reduce(
        (a, b) => a + b.realizedPnlUsd,
        0
      ),
    });
  } catch (err) {
    console.error("Wallet API error:", err);
    return NextResponse.json(
      { error: "Failed to load wallet data" },
      { status: 500 }
    );
  }
}
