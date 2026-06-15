/**
 * Error classes for SynapCores SDK
 */

export class SynapCoresError extends Error {
  public readonly code?: string;
  public readonly details?: Record<string, any>;

  constructor(message: string, code?: string, details?: Record<string, any>) {
    super(message);
    this.name = 'SynapCoresError';
    this.code = code;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SynapCoresError);
    }
  }
}

export class ConnectionError extends SynapCoresError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionError';
  }
}

export class AuthenticationError extends SynapCoresError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'AUTH_ERROR', details);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends SynapCoresError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends SynapCoresError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

export class ServerError extends SynapCoresError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'SERVER_ERROR', details);
    this.name = 'ServerError';
  }
}

export class TimeoutError extends SynapCoresError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'TIMEOUT_ERROR', details);
    this.name = 'TimeoutError';
  }
}

export class RateLimitError extends SynapCoresError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, details?: Record<string, any>) {
    super(message, 'RATE_LIMIT_ERROR', details);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class SQLError extends SynapCoresError {
  public readonly severity: 'ERROR' | 'WARNING' | 'INFO';
  public readonly position?: number;
  public readonly hint?: string;
  public readonly detail?: string;

  constructor(
    message: string,
    code: string,
    severity: 'ERROR' | 'WARNING' | 'INFO' = 'ERROR',
    position?: number,
    hint?: string,
    detail?: string,
    details?: Record<string, any>
  ) {
    super(message, code, details);
    this.name = 'SQLError';
    this.severity = severity;
    this.position = position;
    this.hint = hint;
    this.detail = detail;
  }
}

export class VectorError extends SynapCoresError {
  public readonly vectorDimensions?: number;
  public readonly expectedDimensions?: number;
  public readonly operation?: string;

  constructor(
    message: string,
    code: string,
    vectorDimensions?: number,
    expectedDimensions?: number,
    operation?: string,
    details?: Record<string, any>
  ) {
    super(message, code, details);
    this.name = 'VectorError';
    this.vectorDimensions = vectorDimensions;
    this.expectedDimensions = expectedDimensions;
    this.operation = operation;
  }
}

export class TransactionError extends SynapCoresError {
  public readonly transactionId?: string;
  public readonly transactionState?: string;

  constructor(
    message: string,
    code: string,
    transactionId?: string,
    transactionState?: string,
    details?: Record<string, any>
  ) {
    super(message, code, details);
    this.name = 'TransactionError';
    this.transactionId = transactionId;
    this.transactionState = transactionState;
  }
}

export class MemoryError extends SynapCoresError {
  public readonly namespace?: string;
  public readonly operation?: string;

  constructor(
    message: string,
    code: string = 'MEMORY_ERROR',
    namespace?: string,
    operation?: string,
    details?: Record<string, any>,
  ) {
    super(message, code, details);
    this.name = 'MemoryError';
    this.namespace = namespace;
    this.operation = operation;
  }
}

export class BatchOperationError extends SynapCoresError {
  public readonly failedItems?: Array<{
    index: number;
    error: string;
  }>;
  public readonly totalProcessed?: number;
  public readonly successfulCount?: number;

  constructor(
    message: string,
    code: string,
    failedItems?: Array<{ index: number; error: string }>,
    totalProcessed?: number,
    successfulCount?: number,
    details?: Record<string, any>
  ) {
    super(message, code, details);
    this.name = 'BatchOperationError';
    this.failedItems = failedItems;
    this.totalProcessed = totalProcessed;
    this.successfulCount = successfulCount;
  }
}