import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // read wallet address from query string
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("address");

    if (!wallet) {
      return NextResponse.json(
        { error: "Missing wallet address ?address=" },
        { status: 400 }
      );
    }

    const apiKey = process.env.SOLTRACKER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing SOLTRACKER_API_KEY env variable" },
        { status: 500 }
      );
    }

    const url = `https://data.solanatracker.io/wallet/${wallet}/trades`;

    const response = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
      },
      next: { revalidate: 4 },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "SolanaTracker API error",
          status: response.status,
          body: await response.text(),
        },
        { status: response.status }
      );
    }

    const json = await response.json();
    const rawTrades = json?.trades ?? [];

    const trades = rawTrades.map((t: any) => {
      const isBuy = t.from.token.symbol === "SOL";
      const isSell = t.to.token.symbol === "SOL";

      return {
        txid: t.tx,
        timestamp: t.time,
        program: t.program,

        tokenName: t.to.token.name,
        tokenSymbol: t.to.token.symbol,
        tokenImage: t.to.token.image,

        fromAmount: t.from.amount,
        toAmount: t.to.amount,

        volumeUsd: t.volume.usd,
        isBuy,
        isSell,
      };
    });

    let totalBuys = 0;
    let totalSells = 0;

    for (const t of trades) {
      if (t.isBuy) totalBuys += t.volumeUsd;
      if (t.isSell) totalSells += t.volumeUsd;
    }

    const pnl = totalSells - totalBuys;

    return NextResponse.json({
      wallet,
      pnl,
      totalBuys,
      totalSells,
      trades,
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error", message: err.message },
      { status: 500 }
    );
  }
}
