import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL!;
const BOT_WALLET = process.env.BOT_WALLET_ADDRESS!;
const LAMPORTS_PER_SOL = 1_000_000_000;

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

    // 1) SOL balance
    const lamports = await connection.getBalance(pubkey);
    const solBalance = lamports / LAMPORTS_PER_SOL;

    // 2) SPL token balances
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      pubkey,
      {
        programId: new PublicKey(
          "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        ),
      }
    );

    const tokens = tokenAccounts.value
      .map((acc) => {
        const info: any = acc.account.data.parsed.info;
        const amount = info.tokenAmount.uiAmount as number | null;
        const mint = info.mint as string;
        return { mint, amount: amount || 0 };
      })
      .filter((t) => t.amount > 0);

    // 3) Recent txs for this wallet
    const signatures = await connection.getSignaturesForAddress(pubkey, {
      limit: 30,
    });

    const txsRaw = await Promise.all(
      signatures.map((sig) =>
        connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        })
      )
    );

    // 4) Infer token changes (buys/sells) from token balances deltas
    const trades: {
      signature: string;
      time: string | null;
      mint: string;
      amount: number;
      side: "BUY" | "SELL";
    }[] = [];

    txsRaw.forEach((tx, i) => {
      if (!tx || !tx.meta) return;

      const sig = signatures[i].signature;
      const pre = tx.meta.preTokenBalances || [];
      const post = tx.meta.postTokenBalances || [];
      const blockTime = tx.blockTime;

      pre.forEach((p) => {
        if (p.owner !== BOT_WALLET) return;

        const after = post.find(
          (x) => x.owner === p.owner && x.mint === p.mint
        );

        const beforeAmt = Number(p.uiTokenAmount.uiAmount || 0);
        const afterAmt = Number(after?.uiTokenAmount.uiAmount || 0);
        const delta = afterAmt - beforeAmt;

        if (delta !== 0) {
          trades.push({
            signature: sig,
            time: blockTime
              ? new Date(blockTime * 1000).toISOString()
              : null,
            mint: p.mint,
            amount: Math.abs(delta),
            side: delta > 0 ? "BUY" : "SELL",
          });
        }
      });
    });

    return NextResponse.json({
      wallet: BOT_WALLET,
      solBalance,
      tokens,
      trades,
    });
  } catch (err) {
    console.error("Wallet API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch wallet data" },
      { status: 500 }
    );
  }
}