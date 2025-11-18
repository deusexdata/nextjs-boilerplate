import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, context: { params: { wallet: string } }) {
  try {
    const wallet = context.params.wallet;

    if (!wallet) {
      return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });
    }

    const apiKey = process.env.SOLTRACKER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing SolanaTracker API key" }, { status: 500 });
    }

    const url = `https://data.solanatracker.io/wallet/${wallet}/trades`;

    const response = await fetch(url, {
      headers: { "x-api-key": apiKey },
      next: { revalidate: 5 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "SolanaTracker error", message: await response.text() },
        { status: response.status }
      );
    }

    const json = await response.json();
    const trades = json?.trades ?? [];

    const parsed = trades.map((t: any) => ({
      txid: t.tx,
      timestamp: t.time,
      program: t.program,
      tokenSymbol: t.to.token.symbol,
      tokenName: t.to.token.name,
      volumeUsd: t.volume.usd,
      isBuy: t.from.token.symbol === "SOL",
      isSell: t.to.token.symbol === "SOL",
    }));

    let buys = 0;
    let sells = 0;

    parsed.forEach((t) => {
      if (t.isBuy) buys += t.volumeUsd;
      if (t.isSell) sells += t.volumeUsd;
    });

    const pnl = sells - buys;

    return NextResponse.json({
      wallet,
      trades: parsed,
      pnl,
      totalBuys: buys,
      totalSells: sells,
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: "Server failure", message: err.message },
      { status: 500 }
    );
  }
}
