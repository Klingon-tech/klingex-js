/**
 * Basic Trading Example
 *
 * This example demonstrates how to:
 * - Connect to the KlingEx API
 * - Get market data
 * - Check balances
 * - Place and cancel orders
 */

import { KlingEx, KlingExError, InsufficientFundsError } from 'klingex';

async function main() {
  // Initialize client with your API key
  const client = new KlingEx({
    apiKey: process.env.KLINGEX_API_KEY || 'your-api-key-here',
  });

  try {
    // =========================================================================
    // 1. Get Market Information
    // =========================================================================
    console.log('Fetching markets...');
    const markets = await client.markets.list();
    console.log(`Found ${markets.length} trading pairs`);

    // Find BTC-USDT market
    const btcUsdt = markets.find(
      m => m.base_asset_symbol === 'BTC' && m.quote_asset_symbol === 'USDT'
    );
    if (!btcUsdt) {
      throw new Error('BTC-USDT market not found');
    }
    console.log(`BTC-USDT market ID: ${btcUsdt.id}`);
    console.log(`  Last price: ${btcUsdt.last_price}`);
    console.log(`  24h volume: ${btcUsdt.volume_24h_human}`);
    console.log(`  Maker fee: ${btcUsdt.maker_fee_rate}`);
    console.log(`  Taker fee: ${btcUsdt.taker_fee_rate}`);

    // =========================================================================
    // 2. Get Ticker Data (CMC format)
    // =========================================================================
    console.log('\nFetching tickers...');
    const ticker = await client.markets.ticker('BTC_USDT');
    if (ticker) {
      console.log(`BTC_USDT Ticker:`);
      console.log(`  Last Price: $${ticker.last_price}`);
      console.log(`  Bid: $${ticker.bid}`);
      console.log(`  Ask: $${ticker.ask}`);
      console.log(`  24h High: $${ticker.high}`);
      console.log(`  24h Low: $${ticker.low}`);
      console.log(`  Base Volume: ${ticker.base_volume}`);
      console.log(`  Target Volume: ${ticker.target_volume}`);
    }

    // =========================================================================
    // 3. Get Orderbook
    // =========================================================================
    console.log('\nFetching orderbook...');
    const orderbook = await client.markets.orderbook(btcUsdt.id);
    console.log(`Orderbook for ${orderbook.base_symbol}-${orderbook.quote_symbol}:`);
    console.log('Top 5 Bids:');
    orderbook.bids.slice(0, 5).forEach((bid, i) => {
      console.log(`  ${i + 1}. ${bid.price} @ ${bid.quantity}`);
    });
    console.log('Top 5 Asks:');
    orderbook.asks.slice(0, 5).forEach((ask, i) => {
      console.log(`  ${i + 1}. ${ask.price} @ ${ask.quantity}`);
    });

    // =========================================================================
    // 4. Get OHLCV Data
    // =========================================================================
    console.log('\nFetching OHLCV data...');
    const candles = await client.markets.ohlcv(btcUsdt.id, '1h', { limit: 5 });
    console.log('Last 5 hourly candles:');
    candles.forEach((candle) => {
      console.log(
        `  ${candle.time_bucket}: O=${candle.open_price} H=${candle.high_price} L=${candle.low_price} C=${candle.close_price} V=${candle.volume}`
      );
    });

    // =========================================================================
    // 5. Check Balances
    // =========================================================================
    console.log('\nFetching balances...');
    const balances = await client.wallet.balances();
    const usdtBalance = balances.find(b => b.symbol === 'USDT');
    const btcBalance = balances.find(b => b.symbol === 'BTC');

    console.log(`USDT Balance: ${usdtBalance?.human_available || '0'} available`);
    console.log(`  Deposit address: ${usdtBalance?.deposit_address || 'N/A'}`);
    console.log(`BTC Balance: ${btcBalance?.human_available || '0'} available`);
    console.log(`  Deposit address: ${btcBalance?.deposit_address || 'N/A'}`);

    // =========================================================================
    // 6. Place a Limit Order
    // =========================================================================
    console.log('\nPlacing a limit buy order...');

    // Calculate a price 5% below current market price
    const currentPrice = parseFloat(ticker?.last_price || btcUsdt.last_price);
    const limitPrice = (currentPrice * 0.95).toFixed(2);

    try {
      const order = await client.orders.submit({
        symbol: 'BTC-USDT',
        tradingPairId: btcUsdt.id,
        side: 'BUY',
        quantity: '0.001',  // 0.001 BTC
        price: limitPrice,
      });

      console.log(`Order placed! ID: ${order.order_id}`);
      console.log(`Message: ${order.message}`);

      // =========================================================================
      // 7. Get Open Orders
      // =========================================================================
      console.log('\nFetching open orders...');
      const openOrders = await client.orders.list({ tradingPairId: btcUsdt.id });
      console.log(`You have ${openOrders.length} open orders`);

      openOrders.forEach((o) => {
        console.log(
          `  ${o.id}: ${o.side.toUpperCase()} ${o.amount} @ ${o.price} - ${o.status}`
        );
      });

      // =========================================================================
      // 8. Cancel the Order
      // =========================================================================
      if (openOrders.length > 0) {
        console.log('\nCancelling order...');
        const cancelResult = await client.orders.cancel({
          orderId: order.order_id,
          tradingPairId: btcUsdt.id,
        });
        console.log(`${cancelResult.message}`);
        console.log(`Released balance: ${cancelResult.released_balance}`);
      }
    } catch (error) {
      if (error instanceof InsufficientFundsError) {
        console.log('Insufficient funds to place order');
      } else {
        throw error;
      }
    }

    // =========================================================================
    // 9. Get Order History
    // =========================================================================
    console.log('\nFetching order history...');
    const history = await client.orders.history({ limit: 5 });
    console.log(`Last ${history.orders.length} orders:`);
    history.orders.forEach((order) => {
      console.log(
        `  ${order.side.toUpperCase()} ${order.amount} @ ${order.price} - ${order.status}`
      );
    });

    // =========================================================================
    // 10. Get Assets
    // =========================================================================
    console.log('\nFetching available assets...');
    const assets = await client.markets.assets();
    console.log(`Found ${assets.length} assets:`);
    assets.slice(0, 5).forEach((asset) => {
      console.log(
        `  ${asset.symbol} (${asset.name}): ${asset.decimals} decimals, withdrawal fee: ${asset.withdrawal_fee}`
      );
    });

    console.log('\nDone!');
  } catch (error) {
    if (error instanceof KlingExError) {
      console.error(`API Error: ${error.message} (${error.code})`);
    } else {
      console.error('Error:', error);
    }
    process.exit(1);
  }
}

main();
