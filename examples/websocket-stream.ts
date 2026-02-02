/**
 * WebSocket Streaming Example
 *
 * This example demonstrates how to:
 * - Connect to the WebSocket server
 * - Subscribe to real-time market data
 * - Handle user order and balance updates
 */

import { KlingEx } from 'klingex';

async function main() {
  // Initialize client with your API key
  const client = new KlingEx({
    apiKey: process.env.KLINGEX_API_KEY || 'your-api-key-here',
  });

  // First, get market info to find the market ID
  const markets = await client.markets.list();
  const btcUsdt = markets.find(
    m => m.base_asset_symbol === 'BTC' && m.quote_asset_symbol === 'USDT'
  );

  if (!btcUsdt) {
    console.error('BTC-USDT market not found');
    process.exit(1);
  }

  console.log(`Found BTC-USDT market (ID: ${btcUsdt.id})`);
  console.log(`Current price: ${btcUsdt.last_price}`);
  console.log('');

  console.log('Connecting to WebSocket...');

  // Set up error handler
  client.ws.onError((error) => {
    console.error('WebSocket error:', error.message);
  });

  // Connect
  await client.ws.connect();
  console.log('Connected!\n');

  // =========================================================================
  // Subscribe to Orderbook Updates
  // =========================================================================
  console.log('Subscribing to BTC-USDT orderbook...');
  const unsubOrderbook = client.ws.orderbook('BTC-USDT', (orderbook) => {
    const bestBid = orderbook.bids[0];
    const bestAsk = orderbook.asks[0];
    const spread = parseFloat(bestAsk?.price || '0') - parseFloat(bestBid?.price || '0');

    console.log(
      `[Orderbook] Bid: ${bestBid?.price} | Ask: ${bestAsk?.price} | Spread: ${spread.toFixed(2)}`
    );
  });

  // =========================================================================
  // Subscribe to Trade Updates
  // =========================================================================
  console.log('Subscribing to BTC-USDT trades...');
  client.ws.trades('BTC-USDT', (trade) => {
    const side = trade.side === 'buy' ? 'BUY' : 'SELL';
    console.log(`[Trade] ${side} ${trade.quantity} @ ${trade.price}`);
  });

  // =========================================================================
  // Subscribe to Ticker Updates
  // =========================================================================
  console.log('Subscribing to BTC-USDT ticker...');
  client.ws.ticker('BTC-USDT', (ticker) => {
    console.log(
      `[Ticker] Price: ${ticker.last_price} | Bid: ${ticker.bid} | Ask: ${ticker.ask}`
    );
  });

  // =========================================================================
  // Subscribe to User Order Updates (requires authentication)
  // =========================================================================
  console.log('Subscribing to user order updates...');
  client.ws.userOrders((order) => {
    console.log(`[Order Update] ${order.id} - ${order.status}`);
    console.log(`  Side: ${order.side} | Amount: ${order.amount} | Price: ${order.price}`);
  });

  // =========================================================================
  // Subscribe to User Balance Updates (requires authentication)
  // =========================================================================
  console.log('Subscribing to user balance updates...\n');
  client.ws.userBalances((balance) => {
    console.log(`[Balance Update] ${balance.symbol}: ${balance.human_available} available`);
  });

  console.log('Streaming data... Press Ctrl+C to exit\n');

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\nDisconnecting...');
    unsubOrderbook(); // Unsubscribe from orderbook
    client.ws.disconnect();
    process.exit(0);
  });

  // Prevent exit
  await new Promise(() => {});
}

main().catch(console.error);
