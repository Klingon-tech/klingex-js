# KlingEx JavaScript/TypeScript SDK

Official JavaScript/TypeScript SDK for the [KlingEx](https://klingex.io) cryptocurrency exchange API.

## Installation

```bash
npm install klingex
# or
yarn add klingex
# or
pnpm add klingex
```

## Quick Start

```typescript
import { KlingEx } from 'klingex';

// Initialize client with API key
const client = new KlingEx({
  apiKey: 'your-api-key-here'
});

// Get all markets
const markets = await client.markets.list();
console.log(markets);

// Get your balances
const balances = await client.wallet.balances();
console.log(balances);

// Place a limit order (human-readable values by default)
const order = await client.orders.submit({
  symbol: 'BTC-USDT',
  tradingPairId: 1,
  side: 'buy',
  quantity: '0.5',      // 0.5 BTC
  price: '50000.00'     // $50,000 per BTC
});
console.log(`Order placed: ${order.order_id}`);
```

## Configuration

```typescript
const client = new KlingEx({
  // Authentication (choose one)
  apiKey: 'your-api-key',      // API key authentication
  // jwt: 'your-jwt-token',    // Or JWT authentication

  // Optional settings
  baseUrl: 'https://api.klingex.io',  // API base URL
  wsUrl: 'wss://api.klingex.io/ws',   // WebSocket URL
  timeout: 30000,                      // Request timeout (ms)
  humanReadable: true,                 // Use human-readable values (default: true)
});
```

## API Reference

### Markets

```typescript
// Get all trading pairs
const markets = await client.markets.list();

// Get 24h tickers
const tickers = await client.markets.tickers();

// Get orderbook
const orderbook = await client.markets.orderbook('BTC-USDT');
console.log('Best bid:', orderbook.bids[0]);
console.log('Best ask:', orderbook.asks[0]);

// Get OHLCV (candlestick) data
const candles = await client.markets.ohlcv(1, '1h', { limit: 100 });

// Get recent trades
const trades = await client.markets.trades('BTC-USDT');
```

### Orders

```typescript
// Place a limit order
const order = await client.orders.submit({
  symbol: 'BTC-USDT',
  tradingPairId: 1,
  side: 'buy',
  quantity: '1.0',
  price: '50000.00'
});

// Convenience methods
await client.orders.limitBuy('BTC-USDT', 1, '1.0', '50000.00');
await client.orders.limitSell('BTC-USDT', 1, '1.0', '55000.00');
await client.orders.marketBuy('BTC-USDT', 1, '1.0', 0.01);  // 1% slippage
await client.orders.marketSell('BTC-USDT', 1, '1.0', 0.01);

// Get open orders
const orders = await client.orders.list();
const btcOrders = await client.orders.list({ tradingPairId: 1 });

// Cancel an order
await client.orders.cancel({
  orderId: 'order-uuid',
  tradingPairId: 1
});

// Cancel all orders for a trading pair
const result = await client.orders.cancelAll(1);
console.log(`Cancelled ${result.cancelledCount} orders`);

// Get order history
const history = await client.orders.history({ limit: 100 });
```

### Raw Values vs Human-Readable

By default, the SDK uses human-readable values (e.g., `"1.5"` for 1.5 BTC). To use raw base units:

```typescript
// Human-readable (default)
await client.orders.submit({
  symbol: 'BTC-USDT',
  tradingPairId: 1,
  side: 'buy',
  quantity: '1.5',      // 1.5 BTC
  price: '50000.00',    // $50,000
});

// Raw base units
await client.orders.submit({
  symbol: 'BTC-USDT',
  tradingPairId: 1,
  side: 'buy',
  quantity: '150000000',  // 1.5 BTC in satoshis (8 decimals)
  price: '5000000000',    // $50,000 in base units
  rawValues: true
});

// Or configure globally
const client = new KlingEx({
  apiKey: 'your-key',
  humanReadable: false  // Use raw values by default
});
```

### Wallet

```typescript
// Get all balances
const balances = await client.wallet.balances();

// Get specific balance
const btc = await client.wallet.balance('BTC');
console.log(`Available: ${btc?.human_available} BTC`);

// Get deposit address
const address = await client.wallet.depositAddress(1);
console.log(`Send BTC to: ${address.address}`);

// Withdraw
const withdrawal = await client.wallet.withdraw({
  assetId: 1,
  symbol: 'BTC',
  address: 'bc1q...',
  amount: '0.1'
});

// If 2FA is required
if (withdrawal.requires_2fa) {
  await client.wallet.confirm2FA(withdrawal.session_token!, '123456');
}

// Get history
const deposits = await client.wallet.deposits();
const withdrawals = await client.wallet.withdrawals();
```

### Invoices (Payment Processing)

```typescript
// Create invoice
const invoice = await client.invoices.create({
  amount: '100.00',
  asset: 'USDT',
  description: 'Order #12345',
  webhook_url: 'https://yoursite.com/webhook',
  expires_in: 60  // minutes
});

console.log(`Payment address: ${invoice.payment_address}`);
console.log(`Invoice URL: https://klingex.io/pay/${invoice.id}`);

// List invoices
const invoices = await client.invoices.list({ status: 'pending' });

// Check status
const status = await client.invoices.status(invoice.id);

// Cancel
await client.invoices.cancel(invoice.id);

// Get PDF
const pdf = await client.invoices.pdf(invoice.id);
```

### WebSocket (Real-time Data)

```typescript
// Connect to WebSocket
await client.ws.connect();

// Subscribe to orderbook updates
const unsubOrderbook = client.ws.orderbook('BTC-USDT', (data) => {
  console.log('Orderbook update:', data);
});

// Subscribe to trades
const unsubTrades = client.ws.trades('BTC-USDT', (data) => {
  console.log('New trade:', data);
});

// Subscribe to ticker
client.ws.ticker('BTC-USDT', (ticker) => {
  console.log(`Price: ${ticker.last_price}`);
});

// User-specific channels (requires auth)
client.ws.userOrders((order) => {
  console.log('Order update:', order);
});

client.ws.userBalances((balance) => {
  console.log('Balance update:', balance);
});

// Handle errors
client.ws.onError((error) => {
  console.error('WebSocket error:', error);
});

// Unsubscribe
unsubOrderbook();
unsubTrades();

// Disconnect
client.ws.disconnect();
```

## Error Handling

```typescript
import {
  KlingEx,
  KlingExError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  InsufficientFundsError
} from 'klingex';

try {
  await client.orders.submit({ /* ... */ });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter}s`);
  } else if (error instanceof InsufficientFundsError) {
    console.error('Not enough balance');
  } else if (error instanceof ValidationError) {
    console.error('Invalid parameters:', error.details);
  } else if (error instanceof KlingExError) {
    console.error(`API error: ${error.message} (${error.code})`);
  }
}
```

## TypeScript Support

Full TypeScript support with type definitions included:

```typescript
import type {
  Market,
  Order,
  Balance,
  Ticker,
  Orderbook,
  SubmitOrderParams
} from 'klingex';

const params: SubmitOrderParams = {
  symbol: 'BTC-USDT',
  tradingPairId: 1,
  side: 'buy',
  quantity: '1.0',
  price: '50000.00'
};
```

## Browser Support

The SDK works in both Node.js and browsers. For browsers, make sure you have a WebSocket polyfill if needed.

```html
<script type="module">
  import { KlingEx } from 'https://unpkg.com/klingex/dist/index.mjs';

  const client = new KlingEx({ apiKey: 'your-key' });
  const markets = await client.markets.list();
</script>
```

## License

MIT

## Support

- Documentation: https://klingex.io/support/api-docs
- Issues: https://github.com/Klingon-tech/klingex-js/issues
- Email: support@klingex.io
