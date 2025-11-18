<section className="terminal-box">
  <h2 className="terminal-title">[ RECENT TRADES ]</h2>

  {!data.trades || data.trades.length === 0 ? (
    <p>No recent trades.</p>
  ) : (
    <table className="terminal-table">
      <thead>
        <tr>
          <th>TX</th>
          <th>Time</th>
          <th>Type</th>
          <th>Token</th>
          <th>Amount</th>
          <th>Price (USD)</th>
        </tr>
      </thead>

      <tbody>
        {data.trades.map((t: any, i: number) => {
          const isBuy = t.from.token.symbol === "SOL";

          return (
            <tr key={i}>
              <td>
                <a
                  href={`https://solscan.io/tx/${t.tx}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.tx.slice(0, 12)}…
                </a>
              </td>

              <td>{new Date(t.time).toLocaleString()}</td>

              <td className={isBuy ? "text-green-300" : "text-red-400"}>
                {isBuy ? "BUY" : "SELL"}
              </td>

              <td>{isBuy ? t.to.token.symbol : t.from.token.symbol}</td>

              <td>{isBuy ? t.to.amount : t.from.amount}</td>

              <td>{Number(t.price.usd).toFixed(6)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  )}
</section>
