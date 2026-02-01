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
    console.log('📊 Fetching markets...');
    const markets = await client.markets.list();
    console.log(`Found ${markets.length} trading pairs`);

    // Find BTC-USDT market
    const btcUsdt = markets.find(m => m.symbol === 'BTC-USDT');
    if (!btcUsdt) {
      throw new Error('BTC-USDT market not found');
    }
    console.log(`BTC-USDT market ID: ${btcUsdt.id}`);

    // =========================================================================
    // 2. Get Ticker Data
    // =========================================================================
    console.log('\n💹 Fetching ticker...');
    const ticker = await client.markets.ticker('BTC-USDT');
    if (ticker) {
      console.log(`BTC-USDT Price: $${ticker.last_price}`);
      console.log(`24h Change: ${ticker.price_change_percent_24h}%`);
      console.log(`24h Volume: ${ticker.volume_24h} BTC`);
    }

    // =========================================================================
    // 3. Get Orderbook
    // =========================================================================
    console.log('\n📖 Fetching orderbook...');
    const orderbook = await client.markets.orderbook('BTC-USDT', 5);
    console.log('Top 5 Bids:');
    orderbook.bids.slice(0, 5).forEach((bid, i) => {
      console.log(`  ${i + 1}. ${bid.price} @ ${bid.quantity}`);
    });
    console.log('Top 5 Asks:');
    orderbook.asks.slice(0, 5).forEach((ask, i) => {
      console.log(`  ${i + 1}. ${ask.price} @ ${ask.quantity}`);
    });

    // =========================================================================
    // 4. Check Balances
    // =========================================================================
    console.log('\n💰 Fetching balances...');
    const balances = await client.wallet.balances();
    const usdtBalance = balances.find(b => b.symbol === 'USDT');
    const btcBalance = balances.find(b => b.symbol === 'BTC');

    console.log(`USDT Balance: ${usdtBalance?.human_available || '0'}`);
    console.log(`BTC Balance: ${btcBalance?.human_available || '0'}`);

    // =========================================================================
    // 5. Place a Limit Order
    // =========================================================================
    console.log('\n📝 Placing a limit buy order...');

    // Calculate a price 5% below current market price
    const currentPrice = parseFloat(ticker?.last_price || '50000');
    const limitPrice = (currentPrice * 0.95).toFixed(2);

    try {
      const order = await client.orders.submit({
        symbol: 'BTC-USDT',
        tradingPairId: btcUsdt.id,
        side: 'buy',
        quantity: '0.001',  // 0.001 BTC
        price: limitPrice,
      });

      console.log(`✅ Order placed! ID: ${order.order_id}`);

      // =========================================================================
      // 6. Get Open Orders
      // =========================================================================
      console.log('\n📋 Fetching open orders...');
      const openOrders = await client.orders.list({ tradingPairId: btcUsdt.id });
      console.log(`You have ${openOrders.length} open orders`);

      // =========================================================================
      // 7. Cancel the Order
      // =========================================================================
      if (openOrders.length > 0) {
        console.log('\n❌ Cancelling order...');
        await client.orders.cancel({
          orderId: order.order_id,
          tradingPairId: btcUsdt.id,
        });
        console.log('Order cancelled successfully');
      }
    } catch (error) {
      if (error instanceof InsufficientFundsError) {
        console.log('⚠️ Insufficient funds to place order');
      } else {
        throw error;
      }
    }

    // =========================================================================
    // 8. Get Order History
    // =========================================================================
    console.log('\n📜 Fetching order history...');
    const history = await client.orders.history({ limit: 5 });
    console.log(`Last ${history.orders.length} orders:`);
    history.orders.forEach((order) => {
      console.log(
        `  ${order.side.toUpperCase()} ${order.human_amount} @ ${order.human_price} - ${order.status}`
      );
    });

    console.log('\n✨ Done!');
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
