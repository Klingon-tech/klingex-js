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

## Authentication

The SDK authenticates **with API keys only** (`X-API-Key` header). JWT-only
backend routes (account/profile/2FA management, deposit-address generation,
deposit/withdrawal history, etc.) are intentionally not exposed.

Generate a key in the web UI, granting only the scopes you need:

| Scope       | What it unlocks                                                 |
|-------------|-----------------------------------------------------------------|
| `read`      | Balances, orders/trade history, LP positions, mining-pool data  |
| `trade`     | Submit / cancel orders, cancel-all, create gift codes           |
| `withdraw`  | Submit on-chain withdrawals                                     |
| `liquidity` | Add / remove liquidity from AMM pools                           |

Granting `withdraw` requires 2FA at key-creation time; submission then runs
unattended.

## Quick start

```typescript
import { KlingEx } from 'klingex';

const client = new KlingEx({ apiKey: 'your-api-key' });

// Public market data
const markets = await client.markets.list();
const ticker = await client.markets.ticker('BTC_USDT');

// Balances (requires `read` scope)
const balances = await client.wallet.balances();

// Submit an order (requires `trade` scope; human-readable by default)
const order = await client.orders.submit({
  symbol: 'BTC-USDT',
  tradingPairId: 1,
  side: 'buy',
  quantity: '0.001',
  price: '50000',
});
console.log(`Order placed: ${order.order_id}`);
```

## Configuration

```typescript
const client = new KlingEx({
  apiKey: 'your-api-key',                 // required
  baseUrl: 'https://api.klingex.io',      // optional
  wsUrl:   'wss://ws.klingex.io/ws',      // optional
  timeout: 30000,                         // request timeout (ms)
  humanReadable: true,                    // order amount default
});
```

## API reference

### Markets (public)

```typescript
await client.markets.list();
await client.markets.tickers();
await client.markets.ticker('BTC_USDT');         // note underscore
await client.markets.orderbook(1);               // by trading_pair_id
await client.markets.orderbookRaw(1);
await client.markets.ohlcv(1, '1h', { limit: 100 });
await client.markets.trades(1);
await client.markets.sparklines();
await client.markets.marketInfo('BTC', 'USDT');
await client.markets.assetInfo('BTC');           // by symbol or ID
```

### Orders

```typescript
// Submit (limit when price > 0, market when price === '0')
await client.orders.submit({
  symbol: 'BTC-USDT', tradingPairId: 1, side: 'buy',
  quantity: '1.0', price: '50000',
});

// Helpers
await client.orders.limitBuy('BTC-USDT', 1, '1.0', '50000');
await client.orders.limitSell('BTC-USDT', 1, '1.0', '55000');
await client.orders.marketBuy('BTC-USDT', 1, '1.0');
await client.orders.marketSell('BTC-USDT', 1, '1.0');

// Cancel
await client.orders.cancel({ orderId: '...', tradingPairId: 1 });
const result = await client.orders.cancelAll(1);
console.log(`Cancelled ${result.cancelledCount}`);

// List + history (history takes full filter set: market/side/type/search/from/to)
await client.orders.list({ tradingPairId: 1 });
await client.orders.history({ status: 'filled', from: '2026-01-01', limit: 100 });
```

### Withdrawals (`withdraw` scope)

```typescript
// amount is RAW BASE UNITS — no decimal point.
const result = await client.withdrawals.submit({
  symbol: 'BTC',
  assetId: 1,
  amount: '100000',                // 0.001 BTC (8 decimals)
  address: 'bc1q...',
});
console.log(result.withdrawalId);

// XRP destination tag / Graphene memo are first-class:
await client.withdrawals.submit({
  symbol: 'XRP', assetId: 42, amount: '1000000',
  address: 'rXyz...', destinationTag: 12345,
});
```

### Liquidity pools

```typescript
// Public reads
await client.pools.list();
await client.pools.get(1);

// `read` scope
await client.pools.positions();
await client.pools.positionHistory(1, 30);

// `liquidity` scope — amounts are smallest base units
const mint = await client.pools.addLiquidity({
  poolId: 1,
  baseAmountMax: '100000000',
  quoteAmountMax: '5000000000',
  minLpTokens: '1',
});
await client.pools.removeLiquidity({
  poolId: 1,
  lpTokens: mint.lp_tokens_minted,
  minBaseOut: '0',
  minQuoteOut: '0',
});
```

### Wallets

```typescript
await client.wallet.balances();
await client.wallet.balance('BTC');
await client.wallet.depositAddress('ETH');

// Public sync status
await client.wallets.status();
await client.wallets.statusFor(1);
```

### Mining pool

```typescript
await client.miningPool.configs();
await client.miningPool.stats('HTN');
await client.miningPool.blocks({ symbol: 'HTN', limit: 10 });
await client.miningPool.leaderboard('HTN');

// `read` scope
await client.miningPool.myWorkers('HTN');
await client.miningPool.myRewards({ symbol: 'HTN' });
await client.miningPool.myPayouts({ symbol: 'HTN' });
```

### Gift codes (`trade` scope)

```typescript
const single = await client.giftCodes.create({ assetId: 1, amount: '100000000' });
const batch  = await client.giftCodes.createBulk({ assetId: 1, amountPerCode: '10000000', count: 20 });
```

### Invoices (merchant)

```typescript
// Amount is HUMAN-READABLE for the chosen denomination currency.
const invoice = await client.invoices.create({
  denomination: { type: 'crypto', currency: 'USDT', amount: '100.00' },
  acceptedCoins: ['BTC', 'ETH', 'USDT'],
  description: 'Order #12345',
  expiresInMinutes: 60,
});
console.log(invoice.payment_page_url);
for (const opt of invoice.payment_options ?? []) {
  console.log(`${opt.symbol}: send ${opt.expected_amount} to ${opt.address}`);
}

await client.invoices.list({ status: 'pending', page: 1, pageSize: 20 });
await client.invoices.get(invoice.id);
await client.invoices.cancel(invoice.id);
await client.invoices.status(invoice.id);
const pdf = await client.invoices.getPdf(invoice.id);   // Blob
const stats = await client.invoices.feeStats();
```

## Amount units cheat-sheet

| Where                               | Units                                          |
|-------------------------------------|------------------------------------------------|
| `orders.submit` (default)           | Human-readable (`'1.5'` for 1.5 BTC)           |
| `orders.submit({ rawValues: true })` | Smallest base units (`'150000000'`)           |
| `withdrawals.submit`                | **Raw integer base units only** (no decimals)  |
| `pools.addLiquidity` / `removeLiquidity` | Smallest base units                       |
| `invoices.create`                   | Human-readable for the chosen denomination     |
| `giftCodes.create` / `createBulk`   | Smallest base units                            |

## WebSocket

The WebSocket speaks the real wire protocol: one subscription per trading
pair delivers ticker + orderbook + trades, and user channels use bare names
(`balance` singular, `orders`, `trades`, `account`, ...). API-key auth is
performed post-connect; `connect()` does not resolve until the server's
`auth_result` arrives.

```typescript
import { KlingEx } from 'klingex';

const client = new KlingEx({ apiKey: 'your-key' });

client.ws.onError((err) => console.error('WS error:', err.message));
await client.ws.connect();          // waits for auth_result

// One subscription -> ticker + orderbook + trade messages (dispatch on `msg.type`).
const unsub = client.ws.subscribeMarket('BTC-USDT', (msg) => {
  console.log(msg);
});

// Or use filtered convenience helpers (all share one underlying market sub):
client.ws.orderbook('BTC-USDT', (book) => console.log(book));
client.ws.trades   ('BTC-USDT', (trade) => console.log(trade));
client.ws.ticker   ('BTC-USDT', (t) => console.log(t));

// User channels (require `read` scope on the API key)
client.ws.userOrders   ((o) => console.log('order', o));
client.ws.userBalances ((b) => console.log('balance', b));   // singular `balance`
client.ws.userTrades   ((t) => console.log('trade fill', t));
client.ws.accountEvents((e) => console.log('account', e));

// Other streams
client.ws.subscribeOhlcv(1, '5m', (k) => console.log('candle', k));
client.ws.subscribeInvoice('<invoice-uuid>', (m) => console.log('invoice', m));

unsub();
client.ws.disconnect();
```

### WebSocket trading

```typescript
await client.ws.connect();

const r = await client.ws.placeOrder({
  symbol: 'BTC-USDT', tradingPairId: 1, side: 'BUY',
  quantity: '0.001', price: '50000',
});
console.log(r.orderId);

await client.ws.cancelOrder({ orderId: r.orderId!, tradingPairId: 1 });
```

## Error handling

```typescript
import {
  KlingExError, AuthenticationError, RateLimitError,
  ValidationError, InsufficientFundsError,
} from 'klingex';

try {
  await client.orders.submit({ /* ... */ });
} catch (e) {
  if      (e instanceof AuthenticationError) console.error('bad key / missing scope');
  else if (e instanceof RateLimitError)      console.error(`retry after ${e.retryAfter}s`);
  else if (e instanceof InsufficientFundsError) console.error('not enough balance');
  else if (e instanceof ValidationError)     console.error('bad request', e.details);
  else if (e instanceof KlingExError)        console.error(`${e.statusCode}: ${e.message}`);
  else throw e;
}
```

## TypeScript

Full type definitions ship with the package.

```typescript
import type {
  Market, Order, Balance, Ticker, Orderbook,
  SubmitOrderParams, OrdersHistoryParams,
  PoolListItem, AddLiquidityParams,
  SubmitWithdrawalParams,
} from 'klingex';
```

## Browser support

Works in both Node.js and modern browsers (built-in `fetch` / `WebSocket`).

```html
<script type="module">
  import { KlingEx } from 'https://unpkg.com/klingex/dist/index.mjs';
  const client = new KlingEx({ apiKey: 'your-key' });
  const markets = await client.markets.list();
</script>
```

## Examples

See [`examples/`](./examples) for runnable scripts:

- `basic-trading.ts` — REST orders, balances, history
- `websocket-stream.ts` — public + user channels over WS
- `market-maker.ts` — minimal market-making loop
- `withdrawals.ts` — submit an on-chain withdrawal
- `pools.ts` — inspect pools, add/remove liquidity
- `mining-pool.ts` — pool stats + your workers/rewards

## License

MIT

## Support

- API docs: <https://klingex.io/support/api-docs>
- Issues: <https://github.com/Klingon-tech/klingex-js/issues>
- Email: <info@klingex.io>
