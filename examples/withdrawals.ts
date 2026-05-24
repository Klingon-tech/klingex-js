/**
 * Submit an on-chain withdrawal.
 *
 * Requires an API key with the `withdraw` scope. Granting that scope already
 * passed 2FA at key-creation time, so this call runs unattended.
 *
 * NOTE: amount is RAW INTEGER BASE UNITS (no decimal point). For BTC
 * (8 decimals) 0.001 BTC = 100_000 satoshis.
 */

import { KlingEx, KlingExError } from 'klingex';

async function main() {
  const apiKey = process.env.KLINGEX_API_KEY;
  if (!apiKey) throw new Error('Set KLINGEX_API_KEY before running.');

  const client = new KlingEx({ apiKey });

  // Pull asset_id + decimals from the live wallet rather than hardcoding.
  const balances = await client.wallet.balances();
  const btc = balances.find((b) => b.symbol === 'BTC');
  if (!btc) throw new Error('No BTC wallet for this user.');

  const human = '0.001';
  const raw = BigInt(Math.round(Number(human) * 10 ** btc.decimals)).toString();
  console.log(`Submitting ${human} BTC = ${raw} sats...`);

  try {
    const result = await client.withdrawals.submit({
      symbol: 'BTC',
      assetId: btc.id,
      amount: raw,
      address: 'bc1qexampledontactuallyusethis000000000000',
    });
    console.log(`Submitted: ${result.withdrawalId} (${result.message})`);
  } catch (err) {
    if (err instanceof KlingExError) {
      console.error(`Withdrawal rejected: ${err.statusCode} ${err.message}`);
    } else {
      throw err;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
