/**
 * Mining-pool stats + (with an API key) your workers, rewards and payouts.
 */

import { KlingEx } from 'klingex';

async function main() {
  const apiKey = process.env.KLINGEX_API_KEY;
  const client = apiKey ? new KlingEx({ apiKey }) : new KlingEx({ apiKey: '' } as never);

  const configs = await client.miningPool.configs();
  if (configs.length === 0) {
    console.log('No mining pools configured on this exchange.');
    return;
  }
  console.log('Pool configs:');
  for (const c of configs) {
    console.log(`  ${c.symbol}: ${c.algorithm} fee=${c.pool_fee_percent}% port=${c.stratum_port}`);
  }

  const target = configs[0].symbol;
  const stats = await client.miningPool.stats(target);
  console.log(
    `\n${target} stats: hashrate=${stats.current.pool_hashrate} miners=${stats.current.active_miners} height=${stats.current.block_height}`,
  );

  const blocksRes = await client.miningPool.blocks({ symbol: target, limit: 5 });
  console.log(`Recent ${blocksRes.blocks.length} ${target} blocks (of ${blocksRes.total}):`);
  for (const b of blocksRes.blocks) {
    console.log(`  #${b.block_height} status=${b.status} reward=${b.block_reward}`);
  }

  if (!apiKey) {
    console.log('\n(set KLINGEX_API_KEY for personal workers/rewards/payouts)');
    return;
  }

  const workersRes = await client.miningPool.myWorkers(target);
  console.log(`\nYour ${target} workers: ${workersRes.workers.length}`);
  for (const w of workersRes.workers.slice(0, 5)) {
    const state = w.is_online ? 'online' : 'offline';
    console.log(`  ${w.worker_name}: ${w.hashrate_1m} (${state}, shares ok=${w.shares_accepted} bad=${w.shares_rejected})`);
  }

  const rewardsRes = await client.miningPool.myRewards({ symbol: target, limit: 5 });
  console.log(`\nRecent ${target} rewards:`);
  for (const r of rewardsRes.rewards) {
    console.log(`  ${r.reward_amount_formatted} ${r.asset_symbol} at block #${r.block_height} (${r.status})`);
  }
}

main().catch(console.error);
