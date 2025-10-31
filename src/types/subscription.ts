/**
 * Type definitions for real-time subscriptions
 */

export type ChangeOperation = 'insert' | 'update' | 'delete';

export interface SubscriptionEvent {
  operation: ChangeOperation;
  collection: string;
  document: Document;
  timestamp: Date;
  sequence: number;
}

export interface SubscriptionOptions {
  filter?: Record<string, any>;
  onChange?: (event: SubscriptionEvent) => void | Promise<void>;
}

import { Document } from './collection';