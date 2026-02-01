/**
 * Simple Market Maker Example
 *
 * WARNING: This is for educational purposes only!
 * Running this on a live exchange can result in financial losses.
 *
 * This example demonstrates:
 * - Maintaining bid/ask orders around mid price
 * - Adjusting orders based on market movements
 * - Basic risk management
 */

import { KlingEx, Order, InsufficientFundsError } from 'klingex';

// Configuration
const CONFIG = {
  symbol: 'BTC-USDT',
  tradingPairId: 1,
  // Spread from mid price (0.5% each side = 1% total spread)
  spreadPercent: 0.005,
  // Order size in base currency
  orderSize: '0.001',
  // How often to update orders (ms)
  updateInterval: 10000,
  // Minimum price movement to trigger order update
  minPriceMovement: 0.001, // 0.1%
};

class SimpleMarketMaker {
  private client: KlingEx;
  private currentBidOrder: Order | null = null;
  private currentAskOrder: Order | null = null;
  private lastMidPrice: number = 0;
  private running: boolean = false;

  constructor(apiKey: string) {
    this.client = new KlingEx({ apiKey });
  }

  async start() {
    console.log('🤖 Starting Market Maker...');
    console.log(`   Symbol: ${CONFIG.symbol}`);
    console.log(`   Spread: ${CONFIG.spreadPercent * 100}%`);
    console.log(`   Order Size: ${CONFIG.orderSize}\n`);

    this.running = true;

    // Initial order placement
    await this.updateOrders();

    // Set up periodic updates
    const interval = setInterval(async () => {
      if (this.running) {
        await this.updateOrders();
      }
    }, CONFIG.updateInterval);

    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      this.running = false;
      clearInterval(interval);
      await this.cancelAllOrders();
      process.exit(0);
    });

    console.log('📡 Market maker running. Press Ctrl+C to stop.\n');
  }

  private async updateOrders() {
    try {
      // Get current orderbook to calculate mid price
      const orderbook = await this.client.markets.orderbook(CONFIG.symbol, 1);

      if (!orderbook.bids.length || !orderbook.asks.length) {
        console.log('⚠️ Empty orderbook, skipping update');
        return;
      }

      const bestBid = parseFloat(orderbook.bids[0].price);
      const bestAsk = parseFloat(orderbook.asks[0].price);
      const midPrice = (bestBid + bestAsk) / 2;

      // Check if price moved enough to warrant order update
      if (this.lastMidPrice > 0) {
        const priceChange = Math.abs(midPrice - this.lastMidPrice) / this.lastMidPrice;
        if (priceChange < CONFIG.minPriceMovement) {
          return; // Price hasn't moved enough
        }
      }

      console.log(`📊 Mid price: ${midPrice.toFixed(2)} | Spread: ${((bestAsk - bestBid) / midPrice * 100).toFixed(3)}%`);

      this.lastMidPrice = midPrice;

      // Calculate our bid and ask prices
      const ourBidPrice = (midPrice * (1 - CONFIG.spreadPercent)).toFixed(2);
      const ourAskPrice = (midPrice * (1 + CONFIG.spreadPercent)).toFixed(2);

      // Cancel existing orders if prices changed significantly
      await this.cancelAllOrders();

      // Place new orders
      await this.placeBidOrder(ourBidPrice);
      await this.placeAskOrder(ourAskPrice);

    } catch (error) {
      console.error('Error updating orders:', error);
    }
  }

  private async placeBidOrder(price: string) {
    try {
      const result = await this.client.orders.limitBuy(
        CONFIG.symbol,
        CONFIG.tradingPairId,
        CONFIG.orderSize,
        price
      );
      console.log(`🟢 BID placed: ${CONFIG.orderSize} @ ${price} (${result.order_id})`);
    } catch (error) {
      if (error instanceof InsufficientFundsError) {
        console.log('⚠️ Insufficient funds for bid order');
      } else {
        throw error;
      }
    }
  }

  private async placeAskOrder(price: string) {
    try {
      const result = await this.client.orders.limitSell(
        CONFIG.symbol,
        CONFIG.tradingPairId,
        CONFIG.orderSize,
        price
      );
      console.log(`🔴 ASK placed: ${CONFIG.orderSize} @ ${price} (${result.order_id})`);
    } catch (error) {
      if (error instanceof InsufficientFundsError) {
        console.log('⚠️ Insufficient funds for ask order');
      } else {
        throw error;
      }
    }
  }

  private async cancelAllOrders() {
    try {
      const result = await this.client.orders.cancelAll(CONFIG.tradingPairId);
      if (result.cancelledCount > 0) {
        console.log(`❌ Cancelled ${result.cancelledCount} orders`);
      }
    } catch (error) {
      console.error('Error cancelling orders:', error);
    }
  }
}

// Main
async function main() {
  const apiKey = process.env.KLINGEX_API_KEY;
  if (!apiKey) {
    console.error('Please set KLINGEX_API_KEY environment variable');
    process.exit(1);
  }

  const mm = new SimpleMarketMaker(apiKey);
  await mm.start();
}

main().catch(console.error);
