/**
 * Real-time subscription support for SynapCores SDK.
 *
 * v0.2.0: WebSocket auth uses the ticket exchange flow.
 *   1. POST /v1/ws/ticket -> {token, expiresAt}
 *   2. Open `ws://host:port/ws?token={ticket}`  (note: root /ws, not /v1/ws)
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { Collection } from './collection';
import { SubscriptionOptions, SubscriptionEvent } from './types/subscription';
import { Document } from './types/collection';

export class Subscription extends EventEmitter {
  private ws?: WebSocket;
  private running = false;
  private reconnectTimeout?: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000;

  constructor(
    private readonly collection: Collection,
    private readonly options: SubscriptionOptions = {},
  ) {
    super();
  }

  async connect(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    await this.createConnection();
  }

  private async createConnection(): Promise<void> {
    const client: any = (this.collection as any).client;
    // Mint a fresh WS ticket using the SDK auth context.
    const { token } = await client.createWsTicket();

    const wsBase: string = client._getWsBaseUrl
      ? client._getWsBaseUrl()
      : (() => {
          const cfg = client.config ?? client._getConfig();
          const protocol = cfg.useHttps ? 'wss' : 'ws';
          return `${protocol}://${cfg.host}:${cfg.port}`;
        })();
    const url = `${wsBase}/ws?token=${encodeURIComponent(token)}`;

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      this.reconnectAttempts = 0;
      this.subscribe();
    });

    this.ws.on('message', (data) => {
      this.handleMessage(data.toString());
    });

    this.ws.on('error', (error) => {
      this.emit('error', error);
    });

    this.ws.on('close', () => {
      if (this.running) {
        this.scheduleReconnect();
      }
    });

    this.ws.on('ping', () => {
      this.ws?.pong();
    });
  }

  private subscribe(): void {
    const subscribeMessage = {
      type: 'subscribe',
      collection: this.collection.name,
      filter: this.options.filter || {},
    };

    this.ws?.send(JSON.stringify(subscribeMessage));
  }

  private handleMessage(message: string): void {
    try {
      const data = JSON.parse(message);

      if (data.type === 'error') {
        this.emit('error', new Error(data.message));
        return;
      }

      if (data.type === 'change') {
        const event: SubscriptionEvent = {
          operation: data.operation,
          collection: data.collection,
          document: data.document as Document,
          timestamp: new Date(data.timestamp),
          sequence: data.sequence,
        };

        this.emit('change', event);

        if (this.options.onChange) {
          Promise.resolve(this.options.onChange(event)).catch((error) => {
            this.emit('error', error);
          });
        }
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', new Error('Max reconnection attempts reached'));
      this.close();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    this.reconnectTimeout = setTimeout(() => {
      this.createConnection().catch((error) => {
        this.emit('error', error);
      });
    }, delay);
  }

  async close(): Promise<void> {
    this.running = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }

    this.removeAllListeners();
  }

  // Async iterator support
  async *[Symbol.asyncIterator](): AsyncIterator<SubscriptionEvent> {
    const events: SubscriptionEvent[] = [];
    let resolver: ((value: IteratorResult<SubscriptionEvent>) => void) | null = null;

    const handleChange = (event: SubscriptionEvent) => {
      if (resolver) {
        resolver({ done: false, value: event });
        resolver = null;
      } else {
        events.push(event);
      }
    };

    this.on('change', handleChange);

    try {
      while (this.running) {
        if (events.length > 0) {
          yield events.shift()!;
        } else {
          yield await new Promise<SubscriptionEvent>((resolve) => {
            resolver = (result) => {
              if (!result.done) {
                resolve(result.value);
              }
            };
          });
        }
      }
    } finally {
      this.off('change', handleChange);
    }
  }
}
