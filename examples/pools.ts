/**
 * Inspect AMM pools and (optionally) add/remove liquidity.
 *
 * Pool listings are public. Position reads need an API key with `read`.
 * `addLiquidity` / `removeLiquidity` need `liquidity` scope.
 * All amounts are smallest base units.
 */

import { KlingEx } from 'klingex';

async function main() {
  const apiKey = process.env.KLINGEX_API_KEY;
  const client = apiKey ? new KlingEx({ apiKey }) : new KlingEx({ apiKey: '' } as never);

  const pools = await client.pools.list();
  console.log('Public pools:');
  for (const p of pools) {
    console.log(
      `  #${p.id} ${p.base_symbol}/${p.quote_symbol}  reserves=${p.base_reserve}/${p.quote_reserve}  spot=${p.spot_price}`,
    );
  }

  if (!apiKey) {
    console.log('\n(set KLINGEX_API_KEY to see your positions or modify liquidity)');
    return;
  }

  const positions = await client.pools.positions();
  console.log('\nYour LP positions:');
  if (positions.length === 0) {
    console.log('  (none)');
    return;
  }
  for (const pos of positions) {
    console.log(
      `  #${pos.pool_id} ${pos.base_symbol}/${pos.quote_symbol}  share=${pos.share_pct}%  net_earned=${pos.net_earned_quote}`,
    );
  }

  const first = positions[0];
  const history = await client.pools.positionHistory(first.pool_id, 14);
  console.log(`\nLast ${history.history.length} snapshots for pool #${first.pool_id}`);

  // Liquidity ops are commented out — uncomment to actually move balances.
  //
  // const mint = await client.pools.addLiquidity({
  //   poolId: first.pool_id,
  //   baseAmountMax: '1000000',
  //   quoteAmountMax: '50000000',
  //   minLpTokens: '1',
  // });
  // console.log(`Minted ${mint.lp_tokens_minted} (bootstrap=${mint.is_bootstrap})`);
  //
  // const burn = await client.pools.removeLiquidity({
  //   poolId: first.pool_id,
  //   lpTokens: mint.lp_tokens_minted,
  //   minBaseOut: '0',
  //   minQuoteOut: '0',
  // });
  // console.log(`Burned ${burn.lp_tokens_burned}: got ${burn.base_out}/${burn.quote_out}`);
}

main().catch(console.error);
