import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { wallet: string } }) {
  try {
    const wallet = params.wallet;

    if (!wallet) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    const apiKey = process.env.SOLTRACKER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing SolanaTracker API key" }, { status: 500 });
    }

    const url = `https://data.solanatracker.io/wallet/${wallet}/trades`;

    const response = await fetch(url, {
      headers: { "x-api-key": apiKey }
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: "SolanaTracker error", message: text },
        { status: response.status }
      );
    }

    const json = await response.json();

    // Ensure the response has trades
    const trades = json?.trades ?? [];

    // Normalize trades for frontend usage
    const parsedTrades = trades.map((t: any) => ({
      txid: t.tx,
      timestamp: t.time,
      program: t.program,
      fromSymbol: t.from.token.symbol,
      toSymbol: t.to.token.symbol,
      fromAmount: t.from.amount,
      toAmount: t.to.amount,
      priceUsd: t.price?.usd ?? null,
      volumeUsd: t.volume?.usd ?? 0,
      fromImage: t.from.token.image,
      toImage: t.to.token.image,
      tokenName: t.to.token.name,
      tokenSymbol: t.to.token.symbol,
    }));

    // Basic PnL calculation
    let totalBuys = 0;
    let totalSells = 0;

    for (const t of parsedTrades) {
      const isBuy = t.fromSymbol === "SOL"; // SOL → token
      const isSell = t.toSymbol === "SOL";  // token → SOL

      if (isBuy) totalBuys += t.volumeUsd;
      if (isSell) totalSells += t.volumeUsd;
    }

    const pnl = totalSells - totalBuys;

    return NextResponse.json({
      wallet,
      trades: parsedTrades,
      pnl,
      totalBuys,
      totalSells
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error", message: err.message },
      { status: 500 }
    );
  }
}
