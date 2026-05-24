/**
 * WebSocket streaming example.
 *
 * The new SDK delivers raw server payloads to handlers (no SDK-side shaping).
 * Each market subscription returns ticker + orderbook + trade messages — use
 * `msg.type` to discriminate. User channels require the API key's `read` scope.
 */

import { KlingEx } from 'klingex';

interface MarketMsg {
  type?: string;
  market?: string;
  // ticker fields
  last_price?: string;
  bid?: string;
  ask?: string;
  // orderbook fields (raw [price, qty] tuples)
  bids?: Array<[string | number, string | number]>;
  asks?: Array<[string | number, string | number]>;
  // trade fields
  side?: string;
  price?: string;
  amount?: string;
}

interface OrderMsg {
  id?: string;
  status?: string;
  side?: string;
  amount?: string;
  filled_amount?: string;
  price?: string;
}

interface BalanceMsg {
  symbol?: string;
  balance?: string;
  locked_balance?: string;
}

async function main() {
  const client = new KlingEx({
    apiKey: process.env.KLINGEX_API_KEY ?? 'your-api-key-here',
  });

  client.ws.onError((err) => console.error('WebSocket error:', err.message));

  console.log('Connecting...');
  await client.ws.connect(); // waits for auth_result before resolving
  console.log('Connected.\n');

  // One subscription per pair delivers ticker + orderbook + trades.
  const unsubMarket = client.ws.subscribeMarket('BTC-USDT', (raw) => {
    const msg = raw as MarketMsg;
    switch (msg.type) {
      case 'ticker':
        console.log(`[ticker ${msg.market}] last=${msg.last_price} bid=${msg.bid} ask=${msg.ask}`);
        break;
      case 'orderbook': {
        const bid = msg.bids?.[0];
        const ask = msg.asks?.[0];
        if (bid && ask) {
          console.log(`[orderbook ${msg.market}] bid ${bid[0]}@${bid[1]} | ask ${ask[0]}@${ask[1]}`);
        }
        break;
      }
      case 'trade':
      case 'trades':
      case 'trade_update':
        console.log(`[trade ${msg.market}] ${msg.side} ${msg.amount} @ ${msg.price}`);
        break;
    }
  });

  // User channels (require `read` scope on the API key).
  client.ws.userOrders((raw) => {
    const o = raw as OrderMsg;
    console.log(`[order] ${o.id} ${o.status} ${o.side} ${o.filled_amount}/${o.amount} @ ${o.price}`);
  });

  client.ws.userBalances((raw) => {
    const b = raw as BalanceMsg;
    console.log(`[balance] ${b.symbol}: ${b.balance} (locked=${b.locked_balance})`);
  });

  console.log('Streaming... Ctrl+C to exit.\n');

  process.on('SIGINT', () => {
    unsubMarket();
    client.ws.disconnect();
    process.exit(0);
  });

  await new Promise(() => {});
}

main().catch(console.error);
