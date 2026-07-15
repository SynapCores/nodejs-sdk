var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/client.ts
import axios from "axios";

// src/errors.ts
var SynapCoresError = class _SynapCoresError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = "SynapCoresError";
    this.code = code;
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _SynapCoresError);
    }
  }
};
var NotImplementedError = class extends SynapCoresError {
  constructor(message, details) {
    super(message, "NOT_IMPLEMENTED", details);
    this.name = "NotImplementedError";
  }
};
var ConnectionError = class extends SynapCoresError {
  constructor(message, details) {
    super(message, "CONNECTION_ERROR", details);
    this.name = "ConnectionError";
  }
};
var AuthenticationError = class extends SynapCoresError {
  constructor(message, details) {
    super(message, "AUTH_ERROR", details);
    this.name = "AuthenticationError";
  }
};
var ValidationError = class extends SynapCoresError {
  constructor(message, details) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
};
var NotFoundError = class extends SynapCoresError {
  constructor(message, details) {
    super(message, "NOT_FOUND", details);
    this.name = "NotFoundError";
  }
};
var ServerError = class extends SynapCoresError {
  constructor(message, details) {
    super(message, "SERVER_ERROR", details);
    this.name = "ServerError";
  }
};
var TimeoutError = class extends SynapCoresError {
  constructor(message, details) {
    super(message, "TIMEOUT_ERROR", details);
    this.name = "TimeoutError";
  }
};
var RateLimitError = class extends SynapCoresError {
  constructor(message, retryAfter, details) {
    super(message, "RATE_LIMIT_ERROR", details);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
};
var SQLError = class extends SynapCoresError {
  constructor(message, code, severity = "ERROR", position, hint, detail, details) {
    super(message, code, details);
    this.name = "SQLError";
    this.severity = severity;
    this.position = position;
    this.hint = hint;
    this.detail = detail;
  }
};
var VectorError = class extends SynapCoresError {
  constructor(message, code, vectorDimensions, expectedDimensions, operation, details) {
    super(message, code, details);
    this.name = "VectorError";
    this.vectorDimensions = vectorDimensions;
    this.expectedDimensions = expectedDimensions;
    this.operation = operation;
  }
};
var TransactionError = class extends SynapCoresError {
  constructor(message, code, transactionId, transactionState, details) {
    super(message, code, details);
    this.name = "TransactionError";
    this.transactionId = transactionId;
    this.transactionState = transactionState;
  }
};
var MemoryError = class extends SynapCoresError {
  constructor(message, code = "MEMORY_ERROR", namespace, operation, details) {
    super(message, code, details);
    this.name = "MemoryError";
    this.namespace = namespace;
    this.operation = operation;
  }
};
var BatchOperationError = class extends SynapCoresError {
  constructor(message, code, failedItems, totalProcessed, successfulCount, details) {
    super(message, code, details);
    this.name = "BatchOperationError";
    this.failedItems = failedItems;
    this.totalProcessed = totalProcessed;
    this.successfulCount = successfulCount;
  }
};

// src/subscription.ts
import WebSocket from "ws";
import { EventEmitter } from "events";
var Subscription = class extends EventEmitter {
  constructor(collection, options = {}) {
    super();
    this.collection = collection;
    this.options = options;
    this.running = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1e3;
  }
  async connect() {
    if (this.running) {
      return;
    }
    this.running = true;
    await this.createConnection();
  }
  async createConnection() {
    const client = this.collection.client;
    const protocol = client.config.useHttps ? "wss" : "ws";
    const url = `${protocol}://${client.config.host}:${client.config.port}/v1/ws`;
    const headers = {};
    if (client.config.apiKey) {
      headers["Authorization"] = `Bearer ${client.config.apiKey}`;
    }
    this.ws = new WebSocket(url, { headers });
    this.ws.on("open", () => {
      this.reconnectAttempts = 0;
      this.subscribe();
    });
    this.ws.on("message", (data) => {
      this.handleMessage(data.toString());
    });
    this.ws.on("error", (error) => {
      this.emit("error", error);
    });
    this.ws.on("close", () => {
      if (this.running) {
        this.scheduleReconnect();
      }
    });
    this.ws.on("ping", () => {
      this.ws?.pong();
    });
  }
  subscribe() {
    const subscribeMessage = {
      type: "subscribe",
      collection: this.collection.name,
      filter: this.options.filter || {}
    };
    this.ws?.send(JSON.stringify(subscribeMessage));
  }
  handleMessage(message) {
    try {
      const data = JSON.parse(message);
      if (data.type === "error") {
        this.emit("error", new Error(data.message));
        return;
      }
      if (data.type === "change") {
        const event = {
          operation: data.operation,
          collection: data.collection,
          document: data.document,
          timestamp: new Date(data.timestamp),
          sequence: data.sequence
        };
        this.emit("change", event);
        if (this.options.onChange) {
          Promise.resolve(this.options.onChange(event)).catch((error) => {
            this.emit("error", error);
          });
        }
      }
    } catch (error) {
      this.emit("error", error);
    }
  }
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit("error", new Error("Max reconnection attempts reached"));
      this.close();
      return;
    }
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    this.reconnectTimeout = setTimeout(() => {
      this.createConnection().catch((error) => {
        this.emit("error", error);
      });
    }, delay);
  }
  async close() {
    this.running = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = void 0;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = void 0;
    }
    this.removeAllListeners();
  }
  // Async iterator support
  async *[Symbol.asyncIterator]() {
    const events = [];
    let resolver = null;
    const handleChange = (event) => {
      if (resolver) {
        resolver({ done: false, value: event });
        resolver = null;
      } else {
        events.push(event);
      }
    };
    this.on("change", handleChange);
    try {
      while (this.running) {
        if (events.length > 0) {
          yield events.shift();
        } else {
          yield await new Promise((resolve) => {
            resolver = (result) => {
              if (!result.done) {
                resolve(result.value);
              }
            };
          });
        }
      }
    } finally {
      this.off("change", handleChange);
    }
  }
};

// src/collection.ts
var Collection = class {
  constructor(client, name, schema) {
    this.client = client;
    this.name = name;
    this.schema = schema;
  }
  get basePath() {
    return `/collections/${this.name}`;
  }
  async insert(documents, _autoEmbed = true) {
    const isSingle = !Array.isArray(documents);
    const docs = isSingle ? [documents] : documents;
    if (isSingle) {
      const { data } = await this.client._getHttpClient().post(
        `${this.basePath}/documents`,
        documents
        // Send the document directly as the body
      );
      return {
        ids: [data.id],
        inserted: 1
      };
    } else {
      const ids = [];
      for (const doc of docs) {
        const { data } = await this.client._getHttpClient().post(
          `${this.basePath}/documents`,
          doc
        );
        ids.push(data.id);
      }
      return {
        ids,
        inserted: ids.length
      };
    }
  }
  async get(documentId) {
    try {
      const { data } = await this.client._getHttpClient().get(
        `${this.basePath}/documents/${documentId}`
      );
      return data;
    } catch (error) {
      if (error.code === "NOT_FOUND") {
        return null;
      }
      throw error;
    }
  }
  async update(documentId, data, options = {}) {
    const response = await this.client._getHttpClient().put(
      `${this.basePath}/documents/${documentId}`,
      {
        data,
        merge: options.merge !== false
      }
    );
    return response.data;
  }
  async delete(documentId) {
    const ids = Array.isArray(documentId) ? documentId : [documentId];
    let deleted = 0;
    for (const id of ids) {
      await this.client._getHttpClient().delete(
        `${this.basePath}/documents/${id}`
      );
      deleted += 1;
    }
    return { deleted };
  }
  /**
   * @deprecated Gateway v2 collections_v2 has no per-collection `/search`
   * route. Query documents with SQL via
   * `client.executeQuery("SELECT * FROM <collection> WHERE ...")`, or list
   * documents via the raw `GET /collections/<name>/documents` endpoint.
   */
  async search(_options) {
    throw new NotImplementedError(
      `collection.search is removed \u2014 gateway v2 has no /collections/${this.name}/search route. Use client.executeQuery("SELECT ... WHERE ...") against the collection instead.`
    );
  }
  /**
   * @deprecated Gateway v2 collections_v2 has no per-collection
   * `/vector_search` route. Use the dedicated vector-collection search
   * (`POST /vectors/collections/:c/search`) or an ORDER BY distance SQL
   * query via `client.executeQuery`.
   */
  async vectorSearch(_options) {
    throw new NotImplementedError(
      `collection.vectorSearch is removed \u2014 gateway v2 has no /collections/${this.name}/vector_search route. Use POST /vectors/collections/:c/search, or client.executeQuery("SELECT ... ORDER BY COSINE_SIMILARITY(embedding, $1) DESC LIMIT $2").`
    );
  }
  /**
   * @deprecated Gateway v2 collections_v2 has no per-collection `/query`
   * route. Use `client.executeQuery(...)` or the raw
   * `GET /collections/<name>/documents` listing.
   */
  async query(_options = {}) {
    throw new NotImplementedError(
      `collection.query is removed \u2014 gateway v2 has no /collections/${this.name}/query route. Use client.executeQuery(...) or GET /collections/<name>/documents.`
    );
  }
  /**
   * @deprecated Gateway v2 collections_v2 has no `/count` route. Use
   * `client.executeQuery("SELECT COUNT(*) FROM <collection>")`.
   */
  async count(_filter) {
    throw new NotImplementedError(
      `collection.count is removed \u2014 gateway v2 has no /collections/${this.name}/count route. Use client.executeQuery("SELECT COUNT(*) FROM <collection> WHERE ...").`
    );
  }
  /**
   * @deprecated Gateway v2 collections_v2 has no `/stats` route.
   */
  async stats() {
    throw new NotImplementedError(
      `collection.stats is removed \u2014 gateway v2 has no /collections/${this.name}/stats route. Use client.schema.getTable(name) or a COUNT(*) query for size metrics.`
    );
  }
  /**
   * @deprecated Gateway v2 collections_v2 has no `/indexes` route. Create
   * indexes with SQL via `client.createIndex(...)` /
   * `client.executeQuery("CREATE INDEX ...")`.
   */
  async createIndex(_options) {
    throw new NotImplementedError(
      `collection.createIndex is removed \u2014 gateway v2 has no /collections/${this.name}/indexes route. Use client.createIndex({...}) or client.executeQuery("CREATE INDEX ...").`
    );
  }
  /**
   * @deprecated Gateway v2 collections_v2 has no `/indexes` route. Drop
   * indexes with SQL via `client.dropIndex(...)`.
   */
  async dropIndex(_field) {
    throw new NotImplementedError(
      `collection.dropIndex is removed \u2014 gateway v2 has no /collections/${this.name}/indexes route. Use client.dropIndex(name) or client.executeQuery("DROP INDEX ...").`
    );
  }
  async subscribe(options = {}) {
    const subscription = new Subscription(this, options);
    await subscription.connect();
    return subscription;
  }
};

// src/automl.ts
var AutoMLModel = class {
  constructor(client, info) {
    this.client = client;
    this.info = info;
  }
  get id() {
    return this.info.id;
  }
  get name() {
    return this.info.name;
  }
  async predict(data) {
    const isSingle = !Array.isArray(data);
    const inputs = isSingle ? [data] : data;
    const response = await this.client.synapCores._getHttpClient().post(
      `/automl/models/${this.id}/predict`,
      {
        inputs
      }
    );
    const predictions = response.data.predictions;
    return isSingle ? predictions[0] : predictions;
  }
  async evaluate(testData, target) {
    const payload = {};
    if (typeof testData === "string") {
      payload.collection = testData;
    } else {
      payload.data = testData;
      if (target) {
        payload.target = target;
      }
    }
    const { data } = await this.client.synapCores._getHttpClient().post(
      `/automl/models/${this.id}/evaluate`,
      payload
    );
    return data;
  }
  async delete() {
    await this.client.synapCores._getHttpClient().delete(
      `/automl/models/${this.id}`
    );
  }
};
var AutoMLClient = class {
  constructor(synapCores) {
    this.synapCores = synapCores;
  }
  async train(options) {
    const { data } = await this.synapCores._getHttpClient().post("/automl/train", {
      collection: options.collection,
      target: options.target,
      features: options.features,
      task: options.task || "auto",
      name: options.name || `${options.collection}_${options.target}_model`,
      config: options.config || {},
      validation_split: options.validationSplit || 0.2,
      max_trials: options.maxTrials || 10,
      timeout_minutes: options.timeoutMinutes || 60
    });
    const modelInfo = {
      id: data.id,
      name: data.name,
      task: data.task,
      status: data.status,
      accuracy: data.accuracy,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : void 0,
      config: data.config
    };
    return new AutoMLModel(this, modelInfo);
  }
  async getModel(modelId) {
    const { data } = await this.synapCores._getHttpClient().get(
      `/automl/models/${modelId}`
    );
    const modelInfo = {
      id: data.id,
      name: data.name,
      task: data.task,
      status: data.status,
      accuracy: data.accuracy,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : void 0,
      config: data.config
    };
    return new AutoMLModel(this, modelInfo);
  }
  async listModels(filters) {
    const { data } = await this.synapCores._getHttpClient().get("/automl/models", {
      params: filters
    });
    return (data.models || data || []).map((model) => ({
      id: model.id,
      name: model.name,
      task: model.task,
      status: model.status,
      accuracy: model.accuracy,
      createdAt: new Date(model.created_at),
      updatedAt: model.updated_at ? new Date(model.updated_at) : void 0,
      config: model.config
    }));
  }
  /**
   * Start async training job
   */
  async trainAsync(options) {
    const { data } = await this.synapCores._getHttpClient().post("/automl/train", {
      collection: options.collection,
      target: options.target,
      features: options.features,
      task: options.task || "auto",
      name: options.name || `${options.collection}_${options.target}_model`,
      config: options.config || {},
      validation_split: options.validationSplit || 0.2,
      max_trials: options.maxTrials || 10,
      timeout_minutes: options.timeoutMinutes || 60,
      async_mode: true,
      callback_url: options.callback_url,
      webhook_url: options.webhook_url
    });
    return {
      id: data.id || data.job_id,
      name: data.name,
      status: data.status,
      progress: data.progress || 0,
      phase: data.phase,
      task: data.task,
      current_trial: data.current_trial,
      total_trials: data.total_trials || options.maxTrials || 10,
      best_accuracy: data.best_accuracy,
      eta_ms: data.eta_ms || data.estimated_time_remaining_ms,
      error: data.error,
      started_at: new Date(data.started_at || Date.now()),
      completed_at: data.completed_at ? new Date(data.completed_at) : void 0,
      model_id: data.model_id
    };
  }
  /**
   * Get training job status
   */
  async getTrainingJob(jobId) {
    const { data } = await this.synapCores._getHttpClient().get(
      `/automl/jobs/${jobId}`
    );
    return {
      id: data.id || jobId,
      name: data.name,
      status: data.status,
      progress: data.progress || 0,
      phase: data.phase,
      task: data.task,
      current_trial: data.current_trial,
      total_trials: data.total_trials,
      best_accuracy: data.best_accuracy,
      eta_ms: data.eta_ms || data.estimated_time_remaining_ms,
      error: data.error,
      started_at: new Date(data.started_at),
      completed_at: data.completed_at ? new Date(data.completed_at) : void 0,
      model_id: data.model_id
    };
  }
  /**
   * List training jobs
   */
  async listTrainingJobs(options = {}) {
    const params = new URLSearchParams();
    if (options.status) params.append("status", options.status);
    if (options.page) params.append("page", options.page.toString());
    if (options.page_size) params.append("page_size", options.page_size.toString());
    const { data } = await this.synapCores._getHttpClient().get(
      `/automl/jobs?${params.toString()}`
    );
    return (data.jobs || data).map((job) => ({
      id: job.id,
      name: job.name,
      status: job.status,
      progress: job.progress || 0,
      phase: job.phase,
      task: job.task,
      current_trial: job.current_trial,
      total_trials: job.total_trials,
      best_accuracy: job.best_accuracy,
      eta_ms: job.eta_ms || job.estimated_time_remaining_ms,
      error: job.error,
      started_at: new Date(job.started_at),
      completed_at: job.completed_at ? new Date(job.completed_at) : void 0,
      model_id: job.model_id
    }));
  }
  /**
   * Cancel a training job
   */
  async cancelTrainingJob(jobId) {
    await this.synapCores._getHttpClient().post(`/automl/jobs/${jobId}/stop`);
  }
  /**
   * Get training metrics for a job.
   *
   * @deprecated The gateway v2 AutoML surface does not expose a per-job
   * metrics timeline. Read the final metrics from the completed job via
   * {@link getTrainingJob} (`job.best_accuracy`) or from the trained model
   * via {@link getModel} instead.
   */
  async getTrainingMetrics(_jobId) {
    throw new NotImplementedError(
      "client.automl.getTrainingMetrics is removed \u2014 the gateway v2 AutoML surface has no per-job metrics timeline. Use client.automl.getTrainingJob(jobId) for the final accuracy, or client.automl.getModel(modelId) for the trained model metrics."
    );
  }
  /**
   * Wait for training job to complete
   */
  async waitForTrainingJob(jobId, options = {}) {
    const pollInterval = options.pollInterval || 2e3;
    const timeout = options.timeout || 36e5;
    const startTime = Date.now();
    while (true) {
      const job = await this.getTrainingJob(jobId);
      if (options.onProgress) {
        options.onProgress(job);
      }
      if (job.status === "completed") {
        if (!job.model_id) {
          throw new Error("Training completed but no model ID returned");
        }
        return await this.getModel(job.model_id);
      }
      if (job.status === "failed") {
        throw new Error(`Training failed: ${job.error || "Unknown error"}`);
      }
      if (job.status === "cancelled") {
        throw new Error("Training was cancelled");
      }
      if (Date.now() - startTime > timeout) {
        throw new Error("Timeout waiting for training job to complete");
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
};

// src/nlp.ts
var NLPClient = class {
  constructor(synapCores) {
    this.synapCores = synapCores;
  }
  /**
   * Run several NLP tasks in one call.
   *
   * @deprecated The gateway v2 AI surface has no combined `/ai/analyze`
   * endpoint. Call the individual task methods instead —
   * {@link sentiment}, {@link extractEntities} and {@link summarize} —
   * each of which maps to a real gateway route.
   */
  async analyze(_options) {
    throw new NotImplementedError(
      "client.nlp.analyze is removed \u2014 the gateway v2 AI surface has no combined analyze endpoint. Call client.nlp.sentiment(text), client.nlp.extractEntities(text) and client.nlp.summarize({text}) individually instead."
    );
  }
  async summarize(options) {
    const body = {
      text: options.text,
      max_length: options.maxLength || 150
    };
    const { data } = await this.synapCores._getHttpClient().post("/ai/summarize", body);
    return data.summary;
  }
  async extractEntities(text, entityTypes) {
    const { data } = await this.synapCores._getHttpClient().post("/ai/entities", {
      text,
      entity_types: entityTypes
    });
    return (data.entities || []).map((e) => ({
      text: e.text,
      type: e.entity_type ?? e.type,
      start: e.start,
      end: e.end,
      score: e.confidence ?? e.score
    }));
  }
  async sentiment(text) {
    const analyzeOne = async (value) => {
      const { data } = await this.synapCores._getHttpClient().post("/ai/sentiment", {
        text: value
      });
      return {
        label: data.sentiment,
        score: data.scores ? (data.scores.positive ?? 0) - (data.scores.negative ?? 0) : data.confidence,
        confidence: data.confidence
      };
    };
    if (Array.isArray(text)) {
      const out = [];
      for (const value of text) {
        out.push(await analyzeOne(value));
      }
      return out;
    }
    return analyzeOne(text);
  }
  async classify(options) {
    const toMap = (classifications) => {
      const map = {};
      for (const c of classifications || []) {
        map[c.category] = c.confidence ?? c.score;
      }
      return map;
    };
    const classifyOne = async (value) => {
      const { data } = await this.synapCores._getHttpClient().post("/ai/classify", {
        text: value,
        categories: options.categories,
        multi_label: options.multiLabel || false
      });
      return toMap(data.classifications);
    };
    if (Array.isArray(options.text)) {
      const out = [];
      for (const value of options.text) {
        out.push(await classifyOne(value));
      }
      return out;
    }
    return classifyOne(options.text);
  }
};

// src/recipes.ts
var RecipeClient = class {
  constructor(synapCores) {
    this.synapCores = synapCores;
  }
  /**
   * Create a new recipe
   */
  async create(options) {
    const { data } = await this.synapCores._getHttpClient().post("/recipes", {
      name: options.name,
      description: options.description,
      category: options.category,
      content: options.content,
      tags: options.tags || [],
      parameters: options.parameters || []
    });
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      content: data.content,
      tags: data.tags || [],
      parameters: data.parameters || [],
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      author: data.author,
      execution_count: data.execution_count,
      version: data.version
    };
  }
  /**
   * List recipes with optional filters
   */
  async list(options = {}) {
    const params = new URLSearchParams();
    if (options.category) params.append("category", options.category);
    if (options.search) params.append("search", options.search);
    if (options.page) params.append("page", options.page.toString());
    if (options.page_size) params.append("page_size", options.page_size.toString());
    if (options.tags && options.tags.length > 0) {
      params.append("tags", options.tags.join(","));
    }
    const { data } = await this.synapCores._getHttpClient().get(
      `/recipes?${params.toString()}`
    );
    return (data.recipes || data).map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      category: recipe.category,
      tags: recipe.tags || [],
      created_at: new Date(recipe.created_at),
      updated_at: new Date(recipe.updated_at),
      author: recipe.author,
      execution_count: recipe.execution_count
    }));
  }
  /**
   * Get a specific recipe by ID
   */
  async get(id) {
    const { data } = await this.synapCores._getHttpClient().get(`/recipes/${id}`);
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      content: data.content,
      tags: data.tags || [],
      parameters: data.parameters || [],
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      author: data.author,
      execution_count: data.execution_count,
      version: data.version
    };
  }
  /**
   * Update an existing recipe
   */
  async update(id, updates) {
    const { data } = await this.synapCores._getHttpClient().put(`/recipes/${id}`, updates);
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      content: data.content,
      tags: data.tags || [],
      parameters: data.parameters || [],
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      author: data.author,
      execution_count: data.execution_count,
      version: data.version
    };
  }
  /**
   * Delete a recipe
   */
  async delete(id) {
    await this.synapCores._getHttpClient().delete(`/recipes/${id}`);
  }
  /**
   * Execute a recipe
   */
  async execute(options) {
    const { data } = await this.synapCores._getHttpClient().post(
      `/recipes/${options.recipe}/execute`,
      {
        parameters: options.parameters || {},
        dry_run: options.dry_run || false
      }
    );
    return {
      id: data.id || data.execution_id,
      success: data.success,
      results: data.results,
      error: data.error,
      execution_time_ms: data.execution_time_ms || data.took_ms,
      statements_executed: data.statements_executed || 0
    };
  }
  /**
   * Generate a recipe using AI
   */
  async generate(options) {
    const { data } = await this.synapCores._getHttpClient().post("/ai/generate-recipe", {
      intent: options.intent,
      category: options.category,
      context: options.context
    });
    return {
      name: data.name,
      description: data.description,
      content: data.content
    };
  }
  /**
   * List available recipe categories
   */
  async listCategories() {
    const { data } = await this.synapCores._getHttpClient().get(
      "/recipes/categories/counts"
    );
    if (Array.isArray(data)) {
      return data.map((c) => typeof c === "string" ? c : c.category ?? c.name);
    }
    if (data && Array.isArray(data.categories)) {
      return data.categories.map(
        (c) => typeof c === "string" ? c : c.category ?? c.name
      );
    }
    if (data && typeof data === "object") {
      return Object.keys(data.counts ?? data);
    }
    return [];
  }
};

// src/schema.ts
var SchemaClient = class {
  constructor(synapCores) {
    this.synapCores = synapCores;
  }
  /**
   * List all tables in the database
   */
  async listTables(options = {}) {
    const params = new URLSearchParams();
    if (options.includeSystem) {
      params.append("include_system", "true");
    }
    const { data } = await this.synapCores._getHttpClient().get(
      `/schema/tables?${params.toString()}`
    );
    return (data.tables || data).map((table) => ({
      name: table.name,
      type: table.type || "table",
      column_count: table.column_count || 0,
      row_count: table.row_count,
      size_bytes: table.size_bytes,
      created_at: table.created_at ? new Date(table.created_at) : void 0,
      updated_at: table.updated_at ? new Date(table.updated_at) : void 0,
      comment: table.comment
    }));
  }
  /**
   * Get complete schema for a specific table
   */
  async getTable(tableName) {
    const { data } = await this.synapCores._getHttpClient().get(
      `/schema/tables/${tableName}`
    );
    return {
      table: {
        name: data.name,
        type: data.type || "table",
        column_count: data.columns?.length || 0,
        row_count: data.row_count,
        size_bytes: data.size_bytes,
        created_at: data.created_at ? new Date(data.created_at) : void 0,
        updated_at: data.updated_at ? new Date(data.updated_at) : void 0,
        comment: data.comment
      },
      columns: (data.columns || []).map((col) => ({
        name: col.name,
        data_type: col.data_type || col.type,
        nullable: col.nullable !== false,
        default_value: col.default_value || col.default,
        is_primary_key: col.is_primary_key || col.primary_key,
        is_unique: col.is_unique || col.unique,
        is_indexed: col.is_indexed || col.indexed,
        foreign_key: col.foreign_key,
        comment: col.comment,
        ordinal_position: col.ordinal_position || col.position
      })),
      indexes: (data.indexes || []).map((idx) => ({
        name: idx.name,
        table: idx.table || tableName,
        type: idx.type || "btree",
        columns: idx.columns || [],
        is_unique: idx.is_unique || idx.unique || false,
        is_primary: idx.is_primary || idx.primary || false,
        size_bytes: idx.size_bytes,
        created_at: idx.created_at ? new Date(idx.created_at) : void 0
      })),
      constraints: data.constraints || [],
      relationships: (data.relationships || []).map((rel) => ({
        type: rel.type,
        from_table: rel.from_table || rel.source_table,
        from_column: rel.from_column || rel.source_column,
        to_table: rel.to_table || rel.target_table,
        to_column: rel.to_column || rel.target_column,
        name: rel.name
      }))
    };
  }
  /**
   * Get columns for a specific table
   */
  async getColumns(tableName) {
    const schema = await this.getTable(tableName);
    return schema.columns;
  }
  /**
   * Get indexes for a specific table
   */
  async getIndexes(tableName) {
    const schema = await this.getTable(tableName);
    return schema.indexes;
  }
  /**
   * Get all relationships in the database.
   *
   * @deprecated The gateway v2 schema surface exposes relationships only
   * per-table, inside {@link getTable} (`schema.relationships`). There is no
   * database-wide `/schema/relationships` route. Iterate {@link listTables}
   * and read each table's relationships instead.
   */
  async getRelationships() {
    throw new NotImplementedError(
      "client.schema.getRelationships is removed \u2014 the gateway v2 schema surface has no database-wide relationships route. Read per-table relationships from client.schema.getTable(name).relationships."
    );
  }
  /**
   * Get schema statistics.
   *
   * @deprecated No `/schema/statistics` route exists in gateway v2. Derive
   * counts from {@link listTables}, or query the engine directly via
   * `client.executeQuery('SHOW TABLES')`.
   */
  async getStatistics() {
    throw new NotImplementedError(
      "client.schema.getStatistics is removed \u2014 no /schema/statistics route exists in gateway v2. Derive counts from client.schema.listTables() or client.executeQuery('SHOW TABLES')."
    );
  }
  /**
   * Validate a schema definition.
   *
   * @deprecated No `/schema/validate` route exists in gateway v2.
   */
  async validateSchema(_schema) {
    throw new NotImplementedError(
      "client.schema.validateSchema is removed \u2014 no /schema/validate route exists in gateway v2. Attempt the DDL via client.createTable() / client.executeQuery() and handle the returned error instead."
    );
  }
  /**
   * Compare two schemas.
   *
   * @deprecated No `/schema/compare` route exists in gateway v2.
   */
  async compareSchemas(_schema1, _schema2) {
    throw new NotImplementedError(
      "client.schema.compareSchemas is removed \u2014 no /schema/compare route exists in gateway v2. Diff two client.schema.getTable() results client-side instead."
    );
  }
  /**
   * Generate SQL DDL for a table.
   *
   * @deprecated No `/schema/tables/:t/ddl` route exists in gateway v2.
   */
  async generateDDL(_tableName) {
    throw new NotImplementedError(
      "client.schema.generateDDL is removed \u2014 no DDL-generation route exists in gateway v2. Use client.executeQuery('SHOW CREATE TABLE <name>') if supported by your engine build."
    );
  }
  /**
   * Analyze table and update statistics.
   *
   * @deprecated No `/schema/tables/:t/analyze` route exists in gateway v2.
   */
  async analyzeTable(tableName) {
    throw new NotImplementedError(
      `client.schema.analyzeTable is removed \u2014 no analyze route exists in gateway v2. Run client.executeQuery('ANALYZE ${tableName}') if your engine build supports it.`
    );
  }
};

// src/import.ts
var ImportExportClient = class {
  constructor(synapCores) {
    this.synapCores = synapCores;
  }
  /**
   * Import data into a table from a CSV or JSON payload.
   *
   * Gateway (v2): `POST /data/import/{csv|json}` (multipart/form-data). The
   * endpoint is chosen from `options.format`. The file/content is sent under
   * the `file` field; table + parsing hints map to the handler's field names
   * (`table` → `table_name`, `skip_header` → `has_headers`, `primary_keys`
   * → `primary_key`).
   */
  async import(options) {
    const format = (options.format || "csv").toLowerCase();
    if (format !== "csv" && format !== "json") {
      throw new NotImplementedError(
        `client.import.import only supports 'csv' and 'json' on gateway v2 (got '${options.format}'). Load other formats via client.executeQuery() INSERT statements.`
      );
    }
    let FormDataClass;
    try {
      FormDataClass = __require("form-data");
    } catch {
      FormDataClass = FormData;
    }
    const formData = new FormDataClass();
    formData.append("table_name", options.table);
    if (options.mode === "replace") {
      formData.append("drop_existing", "true");
    }
    if (options.skip_header !== void 0) {
      formData.append("has_headers", options.skip_header.toString());
    }
    if (options.delimiter) formData.append("delimiter", options.delimiter);
    if (options.batch_size) formData.append("batch_size", options.batch_size.toString());
    if (options.primary_keys && options.primary_keys.length > 0) {
      formData.append("primary_key", options.primary_keys[0]);
    }
    if (Buffer.isBuffer(options.data)) {
      formData.append("file", options.data, { filename: `data.${format}` });
    } else {
      if (typeof Blob !== "undefined") {
        formData.append("file", new Blob([options.data]), `data.${format}`);
      } else {
        formData.append("file", Buffer.from(String(options.data)), {
          filename: `data.${format}`
        });
      }
    }
    const headers = {};
    if (typeof formData.getHeaders === "function") {
      Object.assign(headers, formData.getHeaders());
    } else {
      headers["Content-Type"] = "multipart/form-data";
    }
    const { data } = await this.synapCores._getHttpClient().post(
      `/data/import/${format}`,
      formData,
      { headers }
    );
    return {
      id: data.id || data.job_id || "",
      success: data.success !== false,
      rows_processed: data.rows_processed ?? data.rows_imported ?? 0,
      rows_imported: data.rows_imported ?? 0,
      rows_failed: data.rows_failed ?? 0,
      duration_ms: data.duration_ms || data.took_ms || 0,
      errors: data.errors || [],
      warnings: data.warnings || []
    };
  }
  /**
   * Export data from a table or query.
   *
   * @deprecated The gateway v2 surface has no `/export` route. Export via
   * `client.executeQuery('SELECT ...')` and serialize the returned rows
   * client-side.
   */
  async export(_options) {
    throw new NotImplementedError(
      "client.import.export is removed \u2014 no /export route exists in gateway v2. Run client.executeQuery('SELECT ...') and serialize the rows."
    );
  }
  /**
   * @deprecated Import is synchronous on gateway v2; there is no job-status
   * route. {@link import} returns the final result directly.
   */
  async getImportStatus(_jobId) {
    throw new NotImplementedError(
      "client.import.getImportStatus is removed \u2014 imports are synchronous on gateway v2 and return their result directly from client.import.import()."
    );
  }
  /**
   * @deprecated No `/export` route exists in gateway v2.
   */
  async getExportStatus(_jobId) {
    throw new NotImplementedError(
      "client.import.getExportStatus is removed \u2014 no /export route exists in gateway v2."
    );
  }
  /**
   * @deprecated Imports are synchronous on gateway v2; nothing to cancel.
   */
  async cancelImport(_jobId) {
    throw new NotImplementedError(
      "client.import.cancelImport is removed \u2014 imports are synchronous on gateway v2 and cannot be cancelled mid-flight."
    );
  }
  /**
   * @deprecated No `/export` route exists in gateway v2.
   */
  async cancelExport(_jobId) {
    throw new NotImplementedError(
      "client.import.cancelExport is removed \u2014 no /export route exists in gateway v2."
    );
  }
  /**
   * @deprecated No bulk/multi-source import route exists in gateway v2. Call
   * {@link import} once per source.
   */
  async bulkImport(_options) {
    throw new NotImplementedError(
      "client.import.bulkImport is removed \u2014 no bulk-import route exists in gateway v2. Call client.import.import() once per source instead."
    );
  }
  /**
   * @deprecated No `/import/validate` route exists in gateway v2. The
   * import endpoints validate on ingest and report row errors in the result.
   */
  async validateData(_options) {
    throw new NotImplementedError(
      "client.import.validateData is removed \u2014 no /import/validate route exists in gateway v2. client.import.import() validates on ingest and reports row errors in its result."
    );
  }
  /**
   * @deprecated No import-template route exists in gateway v2. Derive the
   * column list from `client.schema.getTable(name)`.
   */
  async getImportTemplate(_tableName, _format = "csv") {
    throw new NotImplementedError(
      "client.import.getImportTemplate is removed \u2014 no template route exists in gateway v2. Build a header row from client.schema.getTable(name).columns."
    );
  }
  /**
   * @deprecated Imports are synchronous on gateway v2; there is no job list.
   */
  async listJobs(_options = {}) {
    throw new NotImplementedError(
      "client.import.listJobs is removed \u2014 imports are synchronous on gateway v2 and are not tracked as jobs."
    );
  }
  /**
   * @deprecated No `/export` route exists in gateway v2.
   */
  async downloadExport(_jobId) {
    throw new NotImplementedError(
      "client.import.downloadExport is removed \u2014 no /export route exists in gateway v2."
    );
  }
  /**
   * @deprecated Streaming import polling relied on job-status routes that do
   * not exist in gateway v2. Call {@link import} directly — it returns the
   * final result synchronously.
   */
  async streamImport(_options, _onProgress) {
    throw new NotImplementedError(
      "client.import.streamImport is removed \u2014 gateway v2 imports are synchronous. Call client.import.import() directly."
    );
  }
  /**
   * @deprecated No `/export` route exists in gateway v2.
   */
  async streamExport(_options, _onProgress) {
    throw new NotImplementedError(
      "client.import.streamExport is removed \u2014 no /export route exists in gateway v2."
    );
  }
};

// src/integrations.ts
var IntegrationClient = class {
  constructor(synapCores) {
    this.synapCores = synapCores;
  }
  /**
   * Create or update the stored config for an integration type.
   * Gateway (v2): `POST /integrations/:type` (upsert). Config fields are
   * flattened into the request body (see routes/integrations.rs
   * `CreateIntegrationRequest`).
   */
  async create(options) {
    const body = {
      name: options.name,
      description: options.description,
      ...options.config
    };
    const { data } = await this.synapCores._getHttpClient().post(
      `/integrations/${options.type}`,
      body
    );
    return this.mapIntegration(data);
  }
  /**
   * List configured integrations. Gateway (v2): `GET /integrations`.
   */
  async list(options = {}) {
    const params = new URLSearchParams();
    if (options.type) params.append("type", options.type);
    if (options.status) params.append("status", options.status);
    if (options.page) params.append("page", options.page.toString());
    if (options.page_size) params.append("page_size", options.page_size.toString());
    const qs = params.toString();
    const { data } = await this.synapCores._getHttpClient().get(
      `/integrations${qs ? `?${qs}` : ""}`
    );
    return (data.integrations || data || []).map((i) => this.mapIntegration(i));
  }
  /**
   * Get one integration by **type**. Gateway (v2): `GET /integrations/:type`.
   * @param integrationType - the integration type key (e.g. "slack").
   */
  async get(integrationType) {
    const { data } = await this.synapCores._getHttpClient().get(
      `/integrations/${integrationType}`
    );
    return this.mapIntegration(data);
  }
  /**
   * Update the stored config for an integration type (upsert).
   * Gateway (v2): `POST /integrations/:type`.
   * @param integrationType - the integration type key.
   */
  async update(integrationType, updates) {
    const body = {
      name: updates.name,
      description: updates.description,
      ...updates.config || {}
    };
    const { data } = await this.synapCores._getHttpClient().post(
      `/integrations/${integrationType}`,
      body
    );
    return this.mapIntegration(data);
  }
  /**
   * Delete an integration config by **type**.
   * Gateway (v2): `DELETE /integrations/:type`.
   */
  async delete(integrationType) {
    await this.synapCores._getHttpClient().delete(`/integrations/${integrationType}`);
  }
  /**
   * Test an integration connection. Gateway (v2):
   * `POST /integrations/:type/test`.
   * @param options.integration - the integration type key.
   */
  async test(options) {
    const { data } = await this.synapCores._getHttpClient().post(
      `/integrations/${options.integration}/test`,
      {
        payload: options.payload,
        validate_only: options.validate_only || false
      }
    );
    return {
      success: data.success ?? data.test_status === "success",
      validation_errors: data.validation_errors || [],
      response: data.response ?? data.test_message,
      error: data.error,
      latency_ms: data.latency_ms
    };
  }
  // ------------------------------------------------------------------
  // Removed in gateway v2 — no equivalent route.
  // ------------------------------------------------------------------
  /** @deprecated No activate route; set the config's active flag via {@link update}. */
  async activate(_id) {
    throw new NotImplementedError(
      "client.integrations.activate is removed \u2014 gateway v2 has no activate route. Re-save the config via client.integrations.update() instead."
    );
  }
  /** @deprecated No deactivate route; delete the config via {@link delete}. */
  async deactivate(_id) {
    throw new NotImplementedError(
      "client.integrations.deactivate is removed \u2014 gateway v2 has no deactivate route. Delete the config via client.integrations.delete()."
    );
  }
  /**
   * @deprecated Gateway v2 integrations store connection configs; they are not
   * an execution engine. There is no `/integrations/:id/execute` route.
   */
  async execute(_options) {
    throw new NotImplementedError(
      "client.integrations.execute is removed \u2014 gateway v2 integrations are connection configs, not an execution engine. Use client.integrations.test() to validate a connection."
    );
  }
  /** @deprecated No execution-history route in gateway v2. */
  async getExecutionHistory(_integrationId, _options = {}) {
    throw new NotImplementedError(
      "client.integrations.getExecutionHistory is removed \u2014 gateway v2 has no execution-history route. See client.integrations.list() and the audit log."
    );
  }
  /** @deprecated No per-integration stats route in gateway v2. */
  async getStats(_integrationId) {
    throw new NotImplementedError(
      "client.integrations.getStats is removed \u2014 gateway v2 has no stats route. usage_count is included on client.integrations.get()."
    );
  }
  /** @deprecated No webhook routes in gateway v2. */
  async createWebhook(_options) {
    throw new NotImplementedError(
      "client.integrations.createWebhook is removed \u2014 gateway v2 has no integration webhook routes."
    );
  }
  /** @deprecated No webhook routes in gateway v2. */
  async listWebhooks(_integrationId) {
    throw new NotImplementedError(
      "client.integrations.listWebhooks is removed \u2014 gateway v2 has no integration webhook routes."
    );
  }
  /** @deprecated No webhook routes in gateway v2. */
  async deleteWebhook(_webhookId) {
    throw new NotImplementedError(
      "client.integrations.deleteWebhook is removed \u2014 gateway v2 has no integration webhook routes."
    );
  }
  /** @deprecated No per-integration events route in gateway v2. */
  async getEvents(_integrationId, _options = {}) {
    throw new NotImplementedError(
      "client.integrations.getEvents is removed \u2014 gateway v2 has no events route. See the audit log at GET /integrations/audit."
    );
  }
  /** @deprecated No per-integration logs route in gateway v2. */
  async getLogs(_integrationId, _options = {}) {
    throw new NotImplementedError(
      "client.integrations.getLogs is removed \u2014 gateway v2 has no logs route. See the audit log at GET /integrations/audit."
    );
  }
  /** @deprecated No execution/retry route in gateway v2. */
  async retryExecution(_executionId) {
    throw new NotImplementedError(
      "client.integrations.retryExecution is removed \u2014 gateway v2 has no execution/retry route."
    );
  }
  /**
   * Map a gateway IntegrationResponse to the SDK Integration type.
   */
  mapIntegration(data) {
    return {
      id: data.id,
      name: data.integration_name ?? data.name,
      type: data.integration_type ?? data.type,
      status: data.is_active === false ? "inactive" : data.status ?? "active",
      config: data.config,
      description: data.description,
      tags: data.tags || [],
      created_at: data.created_at ? new Date(data.created_at) : /* @__PURE__ */ new Date(),
      updated_at: data.updated_at ? new Date(data.updated_at) : /* @__PURE__ */ new Date(),
      last_success_at: data.last_used_at ? new Date(data.last_used_at) : void 0,
      last_error: data.last_error ?? data.test_message,
      execution_count: data.usage_count ?? data.execution_count
    };
  }
};

// src/backup.ts
var BackupClient = class {
  constructor(synapCores) {
    this.synapCores = synapCores;
  }
  /**
   * Create a new backup. Gateway (v2): `POST /backup/backups`.
   */
  async create(options = {}) {
    const body = {
      name: options.name || `backup_${Date.now()}`,
      description: options.description,
      // v2 enum: "full" | "incremental"
      backup_type: (options.type || "full").toLowerCase(),
      // v2 renamed `tables` → `collections`; omit (null) means all.
      collections: options.tables,
      encryption: options.encrypt || false
    };
    if (typeof options.compression === "string") {
      body.compression = options.compression;
    }
    const { data } = await this.synapCores._getHttpClient().post("/backup/backups", body);
    return this.mapBackup(data);
  }
  /**
   * List backups. Gateway (v2): `GET /backup/backups`.
   */
  async list(options = {}) {
    const params = new URLSearchParams();
    if (options.type) params.append("type", options.type);
    if (options.status) params.append("status", options.status);
    if (options.page) params.append("page", options.page.toString());
    if (options.page_size) params.append("page_size", options.page_size.toString());
    const qs = params.toString();
    const { data } = await this.synapCores._getHttpClient().get(
      `/backup/backups${qs ? `?${qs}` : ""}`
    );
    return (data.backups || data || []).map((backup) => this.mapBackup(backup));
  }
  /**
   * Get a specific backup by ID. Gateway (v2): `GET /backup/backups/:id`.
   */
  async get(id) {
    const { data } = await this.synapCores._getHttpClient().get(`/backup/backups/${id}`);
    return this.mapBackup(data);
  }
  /**
   * Delete a backup. Gateway (v2): `DELETE /backup/backups/:id`.
   */
  async delete(id) {
    await this.synapCores._getHttpClient().delete(`/backup/backups/${id}`);
  }
  /**
   * Restore from a backup. Gateway (v2): `POST /backup/restore`.
   */
  async restore(options) {
    const { data } = await this.synapCores._getHttpClient().post("/backup/restore", {
      backup_id: options.backup_id,
      collections: options.tables,
      overwrite: options.overwrite || false,
      target_prefix: options.target_database
    });
    return {
      id: data.restore_id || data.id,
      success: data.success ?? data.status !== "failed",
      tables_restored: data.collections_restored || data.tables_restored || [],
      rows_restored: data.rows_restored || 0,
      duration_ms: data.duration_ms || data.took_ms || 0,
      error: data.error || data.error_message,
      warnings: data.warnings || []
    };
  }
  /**
   * Get backup status. Gateway (v2) has no dedicated status route — the
   * backup record from `GET /backup/backups/:id` already carries `status`.
   */
  async getBackupStatus(backupId) {
    const { data } = await this.synapCores._getHttpClient().get(
      `/backup/backups/${backupId}`
    );
    return {
      id: data.id || backupId,
      status: data.status,
      progress: data.progress || 0,
      phase: data.phase,
      tables_processed: data.tables_processed,
      total_tables: Array.isArray(data.collections) ? data.collections.length : data.total_tables,
      bytes_processed: data.size_bytes ?? data.bytes_processed,
      eta_ms: data.eta_ms,
      error: data.error || data.error_message,
      started_at: data.created_at ? new Date(data.created_at) : void 0,
      completed_at: data.completed_at ? new Date(data.completed_at) : void 0
    };
  }
  /**
   * Get restore status. Gateway (v2): `GET /backup/restore/:id/status`.
   */
  async getRestoreStatus(restoreId) {
    const { data } = await this.synapCores._getHttpClient().get(
      `/backup/restore/${restoreId}/status`
    );
    return {
      id: data.restore_id || data.id || restoreId,
      status: data.status,
      progress: data.progress || 0,
      phase: data.phase,
      tables_processed: data.tables_processed,
      total_tables: data.total_tables,
      rows_processed: data.rows_processed,
      eta_ms: data.eta_ms,
      error: data.error || data.error_message,
      started_at: data.started_at ? new Date(data.started_at) : void 0,
      completed_at: data.completed_at ? new Date(data.completed_at) : void 0
    };
  }
  /**
   * Download a backup file. Gateway (v2): `GET /backup/backups/:id/download`.
   */
  async download(backupId) {
    const { data } = await this.synapCores._getHttpClient().get(
      `/backup/backups/${backupId}/download`,
      { responseType: "arraybuffer" }
    );
    return Buffer.from(data);
  }
  /**
   * Create a backup schedule. Gateway (v2): `POST /backup/schedules`.
   */
  async createSchedule(options) {
    const bo = options.backup_options || {};
    const { data } = await this.synapCores._getHttpClient().post("/backup/schedules", {
      name: options.name,
      enabled: options.activate !== false,
      schedule: {
        expression: options.cron,
        timezone: options.timezone || "UTC"
      },
      backup_config: {
        backup_type: (bo.type || "full").toLowerCase(),
        collections: bo.tables,
        compression: typeof bo.compression === "string" ? bo.compression : "zstd",
        encryption: bo.encrypt || false,
        retention_days: options.retention_days || 30
      }
    });
    return this.mapSchedule(data);
  }
  /**
   * List backup schedules. Gateway (v2): `GET /backup/schedules`.
   */
  async listSchedules() {
    const { data } = await this.synapCores._getHttpClient().get("/backup/schedules");
    return (data.schedules || data || []).map((s) => this.mapSchedule(s));
  }
  /**
   * Get a specific schedule. Gateway (v2): `GET /backup/schedules/:id`.
   */
  async getSchedule(scheduleId) {
    const { data } = await this.synapCores._getHttpClient().get(
      `/backup/schedules/${scheduleId}`
    );
    return this.mapSchedule(data);
  }
  /**
   * Delete a backup schedule. Gateway (v2): `DELETE /backup/schedules/:id`.
   */
  async deleteSchedule(scheduleId) {
    await this.synapCores._getHttpClient().delete(`/backup/schedules/${scheduleId}`);
  }
  // ------------------------------------------------------------------
  // Removed in gateway v2 — no equivalent route.
  // ------------------------------------------------------------------
  /**
   * @deprecated No schedule-update route in gateway v2. Delete and recreate
   * the schedule via {@link deleteSchedule} + {@link createSchedule}.
   */
  async updateSchedule(_scheduleId, _updates) {
    throw new NotImplementedError(
      "client.backup.updateSchedule is removed \u2014 gateway v2 has no schedule update route. Delete and recreate via deleteSchedule() + createSchedule()."
    );
  }
  /** @deprecated No schedule-activate route in gateway v2. */
  async activateSchedule(_scheduleId) {
    throw new NotImplementedError(
      "client.backup.activateSchedule is removed \u2014 gateway v2 has no activate route. Recreate the schedule with enabled=true."
    );
  }
  /** @deprecated No schedule-deactivate route in gateway v2. */
  async deactivateSchedule(_scheduleId) {
    throw new NotImplementedError(
      "client.backup.deactivateSchedule is removed \u2014 gateway v2 has no deactivate route. Delete the schedule via deleteSchedule()."
    );
  }
  /** @deprecated No backup-cancel route in gateway v2. */
  async cancelBackup(_backupId) {
    throw new NotImplementedError(
      "client.backup.cancelBackup is removed \u2014 gateway v2 has no cancel route."
    );
  }
  /** @deprecated No restore-cancel route in gateway v2. */
  async cancelRestore(_restoreId) {
    throw new NotImplementedError(
      "client.backup.cancelRestore is removed \u2014 gateway v2 has no cancel route."
    );
  }
  /** @deprecated No backup-verify route in gateway v2. */
  async verify(_backupId) {
    throw new NotImplementedError(
      "client.backup.verify is removed \u2014 gateway v2 has no verify route."
    );
  }
  /** @deprecated No backup-metrics route in gateway v2. */
  async getMetrics() {
    throw new NotImplementedError(
      "client.backup.getMetrics is removed \u2014 gateway v2 has no metrics route. Aggregate client.backup.list() client-side instead."
    );
  }
  // ------------------------------------------------------------------
  // Mappers
  // ------------------------------------------------------------------
  mapBackup(data) {
    const collections = Array.isArray(data.collections) ? data.collections : [];
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.backup_type || data.type,
      status: data.status,
      size_bytes: data.size_bytes,
      compressed_size_bytes: data.compressed_size_bytes,
      table_count: data.table_count ?? collections.length,
      created_at: data.created_at ? new Date(data.created_at) : /* @__PURE__ */ new Date(),
      completed_at: data.completed_at ? new Date(data.completed_at) : void 0,
      duration_ms: data.duration_ms || data.took_ms,
      storage: data.storage,
      storage_path: data.storage_path,
      encrypted: data.encrypted ?? data.encryption ?? false,
      tags: data.tags || [],
      parent_backup_id: data.parent_backup_id,
      error: data.error || data.error_message
    };
  }
  mapSchedule(data) {
    return {
      id: data.id,
      name: data.name,
      cron: data.schedule?.expression ?? data.cron,
      backup_options: data.backup_config ?? data.backup_options,
      active: data.enabled ?? data.active,
      last_run_at: data.last_run ? new Date(data.last_run) : void 0,
      next_run_at: data.next_run ? new Date(data.next_run) : void 0,
      created_at: data.created_at ? new Date(data.created_at) : /* @__PURE__ */ new Date(),
      tags: data.tags || []
    };
  }
};

// src/memory.ts
var NAMESPACE_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
var DEFAULT_TOP_K = 10;
var MAX_TOP_K = 100;
var MemoryClient = class {
  constructor(synapCores) {
    this.synapCores = synapCores;
  }
  /**
   * Store text in the agent-memory namespace. The engine auto-creates
   * the backing table on first call. Content is embedded via the
   * configured embedding model.
   *
   * @param namespace - must match `/^[A-Za-z_][A-Za-z0-9_]*$/`
   * @param content - the text to remember
   * @param options - optional structured metadata (JSON-serializable)
   * @returns the generated memory id
   */
  async store(namespace, content, options) {
    this.assertValidNamespace(namespace, "store");
    if (typeof content !== "string") {
      throw new MemoryError(
        "content must be a string",
        "INVALID_CONTENT",
        namespace,
        "store"
      );
    }
    let sql;
    let parameters;
    if (options?.metadata !== void 0) {
      sql = "SELECT MEMORY_STORE($1, $2, $3) AS id";
      parameters = [namespace, content, JSON.stringify(options.metadata)];
    } else {
      sql = "SELECT MEMORY_STORE($1, $2) AS id";
      parameters = [namespace, content];
    }
    let result;
    try {
      result = await this.synapCores.executeQuery({ sql, parameters });
    } catch (err) {
      throw this.mapEngineError(err, namespace, "store");
    }
    const firstRow = result.rows[0];
    if (!firstRow || firstRow[0] == null) {
      throw new MemoryError(
        "MEMORY_STORE returned no memory id",
        "MEMORY_STORE_EMPTY_RESULT",
        namespace,
        "store"
      );
    }
    return String(firstRow[0]);
  }
  /**
   * Semantically retrieve the most-similar stored memories.
   * Returns an empty array if the namespace hasn't been written to yet.
   *
   * @param namespace - must match `/^[A-Za-z_][A-Za-z0-9_]*$/`
   * @param query - free text; auto-embedded by the engine
   * @param options - `topK` defaults to 10, max 100
   */
  async recall(namespace, query, options) {
    this.assertValidNamespace(namespace, "recall");
    if (typeof query !== "string") {
      throw new MemoryError(
        "query must be a string",
        "INVALID_QUERY",
        namespace,
        "recall"
      );
    }
    const topK = options?.topK ?? DEFAULT_TOP_K;
    if (!Number.isInteger(topK) || topK < 1 || topK > MAX_TOP_K) {
      throw new MemoryError(
        `topK must be an integer in [1, ${MAX_TOP_K}], got ${String(topK)}`,
        "INVALID_TOP_K",
        namespace,
        "recall"
      );
    }
    const sql = "SELECT id, content, similarity, metadata, created_at FROM MEMORY_RECALL($1, $2, $3)";
    const parameters = [namespace, query, topK];
    let result;
    try {
      result = await this.synapCores.executeQuery({ sql, parameters });
    } catch (err) {
      if (this.isMissingNamespaceError(err)) {
        return [];
      }
      throw this.mapEngineError(err, namespace, "recall");
    }
    return this.mapRows(result);
  }
  /**
   * Remove a memory by id.
   *
   * @returns `true` if a row was deleted, `false` if the id did not exist.
   */
  async forget(namespace, id) {
    this.assertValidNamespace(namespace, "forget");
    if (typeof id !== "string" || id.length === 0) {
      throw new MemoryError(
        "id must be a non-empty string",
        "INVALID_ID",
        namespace,
        "forget"
      );
    }
    const sql = "SELECT MEMORY_FORGET($1, $2) AS deleted";
    const parameters = [namespace, id];
    let result;
    try {
      result = await this.synapCores.executeQuery({ sql, parameters });
    } catch (err) {
      if (this.isMissingNamespaceError(err)) {
        return false;
      }
      throw this.mapEngineError(err, namespace, "forget");
    }
    const firstRow = result.rows[0];
    if (!firstRow) {
      return false;
    }
    return this.toBool(firstRow[0]);
  }
  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------
  assertValidNamespace(namespace, operation) {
    if (typeof namespace !== "string" || !NAMESPACE_REGEX.test(namespace)) {
      throw new MemoryError(
        `Invalid namespace '${String(namespace)}'. Must match /^[A-Za-z_][A-Za-z0-9_]*$/.`,
        "INVALID_NAMESPACE",
        typeof namespace === "string" ? namespace : void 0,
        operation
      );
    }
  }
  mapRows(result) {
    const columns = result.columns ?? [];
    const idIdx = this.columnIndex(columns, "id");
    const contentIdx = this.columnIndex(columns, "content");
    const simIdx = this.columnIndex(columns, "similarity");
    const metaIdx = this.columnIndex(columns, "metadata");
    const createdIdx = this.columnIndex(columns, "created_at");
    return result.rows.map((row) => {
      const idVal = idIdx >= 0 ? row[idIdx] : void 0;
      const contentVal = contentIdx >= 0 ? row[contentIdx] : void 0;
      const simVal = simIdx >= 0 ? row[simIdx] : void 0;
      const metaVal = metaIdx >= 0 ? row[metaIdx] : void 0;
      const createdVal = createdIdx >= 0 ? row[createdIdx] : void 0;
      return {
        id: idVal == null ? "" : String(idVal),
        content: contentVal == null ? "" : String(contentVal),
        similarity: this.toNumber(simVal),
        metadata: this.parseMetadata(metaVal),
        createdAt: this.parseTimestamp(createdVal)
      };
    });
  }
  columnIndex(columns, name) {
    return columns.findIndex((c) => c?.name === name);
  }
  parseMetadata(value) {
    if (value == null || value === "") {
      return null;
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
      }
    }
    return null;
  }
  parseTimestamp(value) {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === "number") {
      return new Date(value);
    }
    if (typeof value === "string" && value.length > 0) {
      const candidate = value.includes("T") ? value : value.replace(" ", "T");
      const d = new Date(candidate);
      if (!Number.isNaN(d.getTime())) {
        return d;
      }
    }
    return /* @__PURE__ */ new Date(NaN);
  }
  toNumber(value) {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const n = Number(value);
      return Number.isFinite(n) ? n : NaN;
    }
    return NaN;
  }
  toBool(value) {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    if (typeof value === "string") {
      const v = value.toLowerCase();
      return v === "true" || v === "t" || v === "1";
    }
    return false;
  }
  isMissingNamespaceError(err) {
    if (!(err instanceof SynapCoresError)) {
      return false;
    }
    if (err.code === "NOT_FOUND") {
      return true;
    }
    const msg = (err.message ?? "").toLowerCase();
    return msg.includes("does not exist") || msg.includes("no such table") || msg.includes("unknown namespace") || msg.includes("namespace not found");
  }
  mapEngineError(err, namespace, operation) {
    if (err instanceof MemoryError) {
      return err;
    }
    if (err instanceof SynapCoresError) {
      return new MemoryError(
        `Memory ${operation} failed: ${err.message}`,
        err.code ?? "MEMORY_ERROR",
        namespace,
        operation,
        err.details
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return new MemoryError(
      `Memory ${operation} failed: ${message}`,
      "MEMORY_ERROR",
      namespace,
      operation
    );
  }
};

// src/client.ts
var _SynapCores = class _SynapCores {
  constructor(config = {}) {
    this.collectionsCache = /* @__PURE__ */ new Map();
    this.currentTransaction = null;
    this.preparedStatements = /* @__PURE__ */ new Map();
    this.config = {
      host: config.host || "localhost",
      port: config.port || 8080,
      apiKey: config.apiKey || "",
      jwtToken: config.jwtToken || "",
      useHttps: config.useHttps || false,
      timeout: config.timeout || 3e4,
      maxRetries: config.maxRetries || 3,
      rejectUnauthorized: config.rejectUnauthorized !== void 0 ? config.rejectUnauthorized : true
    };
    if (this.config.apiKey && !this.config.apiKey.startsWith("ak_") && !this.config.apiKey.startsWith("aidb_")) {
      throw new Error(
        "Invalid API key format. API keys should start with 'ak_' or 'aidb_' prefix. Please create a valid API key from your AIDB dashboard."
      );
    }
    const protocol = this.config.useHttps ? "https" : "http";
    const baseURL = `${protocol}://${this.config.host}:${this.config.port}/v1`;
    const httpsAgent = this.config.useHttps && !this.config.rejectUnauthorized ? new (__require("https")).Agent({ rejectUnauthorized: false }) : void 0;
    const authHeader = {};
    if (this.config.jwtToken) {
      authHeader["Authorization"] = `Bearer ${this.config.jwtToken}`;
    } else if (this.config.apiKey) {
      authHeader["Authorization"] = `Bearer ${this.config.apiKey}`;
    }
    this.httpClient = axios.create({
      baseURL,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "synapcores-nodejs/0.6.0",
        ...authHeader
      },
      ...httpsAgent && { httpsAgent }
    });
    this.httpClient.interceptors.response.use(
      (response) => {
        const body = response.data;
        if (body && typeof body === "object" && "data" in body && "meta" in body) {
          response.data = body.data;
        }
        return response;
      },
      (error) => this.handleError(error)
    );
    this.automl = new AutoMLClient(this);
    this.nlp = new NLPClient(this);
    this.recipes = new RecipeClient(this);
    this.schema = new SchemaClient(this);
    this.import = new ImportExportClient(this);
    this.integrations = new IntegrationClient(this);
    this.backup = new BackupClient(this);
    this.memory = new MemoryClient(this);
  }
  handleError(error) {
    if (!error.response) {
      const message = error.code === "ECONNREFUSED" ? `Failed to connect to SynapCores server at ${error.config?.baseURL}. Connection refused.` : `Failed to connect to SynapCores server: ${error.message}`;
      throw new ConnectionError(message);
    }
    const { status, data } = error.response;
    const errorData = data;
    const errorInfo = errorData?.error || errorData;
    const errorCode = errorInfo?.code;
    const errorMessage = errorInfo?.message || errorData?.message || "An error occurred";
    const errorDetails = errorInfo?.details || errorData?.details || errorData;
    switch (status) {
      case 400:
        throw new ValidationError(
          errorMessage,
          errorDetails
        );
      case 401:
        throw new AuthenticationError(
          errorMessage,
          errorDetails
        );
      case 403:
        throw new AuthenticationError(
          errorMessage,
          errorDetails
        );
      case 404:
        throw new NotFoundError(
          errorMessage,
          errorDetails
        );
      case 409:
        throw new ValidationError(
          errorMessage,
          errorDetails
        );
      case 413:
        throw new ValidationError(
          errorMessage || "Payload too large",
          errorDetails
        );
      case 422:
        throw new ValidationError(
          errorMessage,
          errorDetails?.errors || errorDetails
        );
      case 429:
        const retryAfter = error.response.headers["retry-after"];
        throw new RateLimitError(
          errorMessage,
          retryAfter ? parseInt(retryAfter) : void 0,
          errorDetails
        );
      case 500:
        throw new ServerError(
          errorMessage || "Internal server error",
          errorDetails
        );
      case 503:
        throw new ServerError(
          errorMessage || "Service unavailable",
          errorDetails
        );
      default:
        if (status >= 500) {
          throw new ServerError(
            errorMessage || `Server error: ${status}`,
            errorDetails
          );
        }
        throw new SynapCoresError(
          errorMessage || `Unexpected error: ${status}`,
          errorCode || "UNEXPECTED_ERROR",
          errorDetails
        );
    }
  }
  /**
   * Create collection (legacy method for backward compatibility)
   */
  async createCollection(options) {
    const request = {
      name: options.name,
      description: options.description,
      schema: options.schema
    };
    return this.createCollectionWithSchema(request);
  }
  /**
   * Create collection matching the database integration guide format
   */
  async createCollectionWithSchema(request) {
    const { data } = await this.httpClient.post("/collections", {
      name: request.name,
      description: request.description,
      schema: request.schema
    });
    const schema = data?.collection?.schema ?? data?.schema ?? request.schema;
    const collection = new Collection(this, request.name, schema);
    this.collectionsCache.set(request.name, collection);
    return collection;
  }
  async getCollection(name) {
    if (this.collectionsCache.has(name)) {
      return this.collectionsCache.get(name);
    }
    const { data } = await this.httpClient.get(`/collections/${name}`);
    const collection = new Collection(this, name, data.schema);
    this.collectionsCache.set(name, collection);
    return collection;
  }
  /**
   * List collections (legacy method for backward compatibility)
   */
  async listCollections() {
    const result = await this.listCollectionsDetailed();
    const arr = result.collections || result.items || (Array.isArray(result) ? result : []);
    return arr.map((c) => c.name);
  }
  /**
   * List collections with detailed information matching the database integration guide format
   */
  async listCollectionsDetailed(options) {
    const params = new URLSearchParams();
    if (options?.page) params.append("page", options.page.toString());
    if (options?.pageSize) params.append("pageSize", options.pageSize.toString());
    if (options?.search) params.append("search", options.search);
    if (options?.sortBy) params.append("sortBy", options.sortBy);
    if (options?.sortOrder) params.append("sortOrder", options.sortOrder);
    const { data } = await this.httpClient.get(
      `/collections${params.toString() ? `?${params.toString()}` : ""}`
    );
    return data;
  }
  async getDocuments(collectionName, page, pageSize) {
    const { data } = await this.httpClient.get(
      `/collections/${collectionName}/documents?page=${page}&pageSize=${pageSize}`
    );
    return data;
  }
  async deleteCollection(name) {
    await this.httpClient.delete(`/collections/${name}`);
    this.collectionsCache.delete(name);
  }
  /**
   * Execute SQL query (legacy method for backward compatibility)
   * @deprecated Use executeQuery for new code
   */
  async sql(query, params) {
    return this.executeQuery({
      sql: query,
      parameters: params ? Object.values(params) : []
    });
  }
  /**
   * Execute SQL query matching the database integration guide format
   */
  async executeQuery(request) {
    const { data } = await this.httpClient.post("/query/execute", {
      sql: request.sql,
      parameters: request.parameters || [],
      max_rows: request.max_rows || 1e3,
      timeout_secs: request.timeout_secs || 300
    });
    return {
      columns: data.columns || [],
      rows: data.rows || [],
      rows_affected: data.rows_affected,
      execution_time_ms: data.execution_time_ms || 0,
      queryPlan: data.query_plan
    };
  }
  /**
   * Execute batch queries
   */
  async executeBatchQueries(request) {
    const { data } = await this.httpClient.post("/query/execute/batch", {
      queries: request.queries,
      transactional: request.transactional || false
    });
    return {
      results: data.results || [],
      total_execution_time_ms: data.total_execution_time_ms || 0
    };
  }
  async embed(text, options = {}) {
    const embedOne = async (value) => {
      const body = { text: value };
      if (options.model) {
        body.model = options.model;
      }
      const { data } = await this.httpClient.post("/ai/embeddings", body);
      return data.embeddings;
    };
    if (Array.isArray(text)) {
      const results = [];
      for (const value of text) {
        results.push(await embedOne(value));
      }
      return results;
    }
    return embedOne(text);
  }
  // Internal method for HTTP client access
  _getHttpClient() {
    return this.httpClient;
  }
  // =================================================================
  // TABLE MANAGEMENT OPERATIONS
  // =================================================================
  /**
   * Creates a new table with the specified columns and constraints
   * @param tableName - Name of the table to create
   * @param columns - Column definitions for the table
   * @param options - Additional table creation options
   * @returns Promise resolving to table creation result
   */
  async createTable(tableName, columns, options = {}) {
    let sql = `CREATE TABLE ${options.ifNotExists ? "IF NOT EXISTS" : ""} ${tableName} (`;
    const columnDefs = columns.map((col) => {
      let def = `${col.name} ${col.dataType}`;
      if (col.constraints) {
        for (const constraint of col.constraints) {
          switch (constraint.type) {
            case "PRIMARY_KEY":
              def += " PRIMARY KEY";
              break;
            case "UNIQUE":
              def += " UNIQUE";
              break;
            case "NOT_NULL":
              def += " NOT NULL";
              break;
            case "CHECK":
              def += ` CHECK (${constraint.expression})`;
              break;
            case "FOREIGN_KEY":
              def += ` REFERENCES ${constraint.referencedTable}(${constraint.referencedColumn})`;
              break;
            case "DEFAULT":
              def += ` DEFAULT ${col.defaultValue}`;
              break;
          }
        }
      }
      return def;
    }).join(", ");
    sql += columnDefs;
    if (options.constraints) {
      const constraintDefs = options.constraints.map((constraint) => {
        switch (constraint.type) {
          case "PRIMARY_KEY":
            return `PRIMARY KEY (${constraint.columns.join(", ")})`;
          case "UNIQUE":
            return `UNIQUE (${constraint.columns.join(", ")})`;
          case "CHECK":
            return `CHECK (${constraint.expression})`;
          case "FOREIGN_KEY":
            return `FOREIGN KEY (${constraint.columns.join(", ")}) REFERENCES ${constraint.referencedTable}(${constraint.referencedColumns?.join(", ")})`;
          default:
            return "";
        }
      }).filter((def) => def);
      if (constraintDefs.length > 0) {
        sql += ", " + constraintDefs.join(", ");
      }
    }
    sql += ")";
    if (options.partitionBy) {
      sql += ` PARTITION BY ${options.partitionBy.type} (${options.partitionBy.column})`;
    }
    return this.sql(sql);
  }
  /**
   * Alters an existing table structure
   * @param tableName - Name of the table to alter
   * @param alterOptions - Alteration options and parameters
   * @returns Promise resolving to alteration result
   */
  async alterTable(tableName, alterOptions) {
    let sql = `ALTER TABLE ${tableName} `;
    switch (alterOptions.action) {
      case "ADD_COLUMN":
        if (!alterOptions.columnDefinition) {
          throw new ValidationError("Column definition required for ADD_COLUMN");
        }
        sql += `ADD COLUMN ${alterOptions.columnDefinition.name} ${alterOptions.columnDefinition.dataType}`;
        break;
      case "DROP_COLUMN":
        sql += `DROP COLUMN ${alterOptions.columnName}`;
        break;
      case "RENAME_COLUMN":
        sql += `RENAME COLUMN ${alterOptions.columnName} TO ${alterOptions.newColumnName}`;
        break;
      case "ALTER_COLUMN":
        sql += `ALTER COLUMN ${alterOptions.columnName} TYPE ${alterOptions.newDataType}`;
        break;
      case "ADD_CONSTRAINT":
        if (!alterOptions.constraint) {
          throw new ValidationError("Constraint required for ADD_CONSTRAINT");
        }
        sql += `ADD CONSTRAINT ${alterOptions.constraint.type.toLowerCase()}_constraint`;
        break;
      case "DROP_CONSTRAINT":
        sql += `DROP CONSTRAINT ${alterOptions.constraintName}`;
        break;
    }
    return this.sql(sql);
  }
  /**
   * Drops an existing table
   * @param tableName - Name of the table to drop
   * @param options - Drop options
   * @returns Promise resolving to drop result
   */
  async dropTable(tableName, options = {}) {
    let sql = `DROP TABLE ${options.ifExists ? "IF EXISTS" : ""} ${tableName}`;
    if (options.cascade) {
      sql += " CASCADE";
    }
    return this.sql(sql);
  }
  /**
   * Describes a table structure including columns, constraints, and indexes
   * @param tableName - Name of the table to describe
   * @returns Promise resolving to table information
   */
  async describeTable(tableName) {
    const { data } = await this.httpClient.get(`/schema/tables/${tableName}`);
    return data;
  }
  /**
   * Lists all tables in the current database
   * @param pattern - Optional pattern to filter table names
   * @returns Promise resolving to array of table names
   */
  async showTables(pattern) {
    const sql = pattern ? `SHOW TABLES LIKE '${pattern}'` : "SHOW TABLES";
    const result = await this.sql(sql);
    return result.rows.map((row) => Object.values(row)[0]);
  }
  // =================================================================
  // INDEX MANAGEMENT OPERATIONS
  // =================================================================
  /**
   * Creates an index on a table
   * @param indexDef - Index definition with name, table, columns, and options
   * @returns Promise resolving to index creation result
   */
  async createIndex(indexDef) {
    const columns = indexDef.columns.map((col) => `${col.name} ${col.order || "ASC"}`).join(", ");
    const sql = `CREATE ${indexDef.unique ? "UNIQUE" : ""} INDEX ${indexDef.ifNotExists ? "IF NOT EXISTS" : ""} ${indexDef.name} ON ${indexDef.tableName} (${columns})`;
    return this.sql(sql);
  }
  /**
   * Drops an existing index
   * @param indexName - Name of the index to drop
   * @param options - Drop options
   * @returns Promise resolving to drop result
   */
  async dropIndex(indexName, options = {}) {
    const sql = `DROP INDEX ${options.ifExists ? "IF EXISTS" : ""} ${indexName}`;
    return this.sql(sql);
  }
  /**
   * Lists all indexes, optionally filtered by table name
   * @param tableName - Optional table name to filter indexes
   * @returns Promise resolving to array of index information
   */
  async showIndexes(tableName) {
    const sql = tableName ? `SHOW INDEXES FROM ${tableName}` : "SHOW INDEXES";
    const result = await this.sql(sql);
    const indexNameIdx = result.columns.findIndex((c) => c.name === "index_name" || c.name === "name");
    const tableNameIdx = result.columns.findIndex((c) => c.name === "table_name" || c.name === "table");
    const columnsIdx = result.columns.findIndex((c) => c.name === "columns" || c.name === "column");
    const uniqueIdx = result.columns.findIndex((c) => c.name === "is_unique" || c.name === "unique");
    return result.rows.map((row) => {
      const indexName = indexNameIdx >= 0 ? row[indexNameIdx] : "";
      const table = tableNameIdx >= 0 ? row[tableNameIdx] : "";
      const columnsStr = columnsIdx >= 0 ? row[columnsIdx] : "";
      const isUnique = uniqueIdx >= 0 ? row[uniqueIdx] : false;
      return {
        name: String(indexName),
        table: String(table),
        columns: typeof columnsStr === "string" ? columnsStr.split(",") : [],
        unique: Boolean(isUnique)
      };
    });
  }
  // =================================================================
  // TRANSACTION SUPPORT
  // =================================================================
  /**
   * Begins a new transaction
   * @param options - Transaction options including isolation level
   * @returns Promise resolving to transaction context
   */
  async beginTransaction(options = {}) {
    if (this.currentTransaction) {
      throw new Error("Transaction already in progress");
    }
    let sql = "BEGIN TRANSACTION";
    if (options.isolationLevel) {
      sql += ` ISOLATION LEVEL ${options.isolationLevel}`;
    }
    if (options.readOnly) {
      sql += " READ ONLY";
    }
    await this.sql(sql);
    this.currentTransaction = {
      id: Math.random().toString(36).substring(7),
      startTime: /* @__PURE__ */ new Date(),
      isolationLevel: options.isolationLevel || "READ_COMMITTED",
      readOnly: options.readOnly || false
    };
    if (options.timeout) {
      setTimeout(() => {
        if (this.currentTransaction) {
          this.rollbackTransaction().catch(console.error);
        }
      }, options.timeout);
    }
    return this.currentTransaction;
  }
  /**
   * Commits the current transaction
   * @returns Promise resolving when transaction is committed
   */
  async commitTransaction() {
    if (!this.currentTransaction) {
      throw new Error("No transaction in progress");
    }
    await this.sql("COMMIT");
    this.currentTransaction = null;
  }
  /**
   * Rolls back the current transaction
   * @returns Promise resolving when transaction is rolled back
   */
  async rollbackTransaction() {
    if (!this.currentTransaction) {
      throw new Error("No transaction in progress");
    }
    await this.sql("ROLLBACK");
    this.currentTransaction = null;
  }
  /**
   * Gets the current transaction context
   * @returns Current transaction context or null if no transaction
   */
  getCurrentTransaction() {
    return this.currentTransaction;
  }
  // =================================================================
  // BATCH OPERATIONS
  // =================================================================
  /**
   * Performs batch insert operations
   * @param options - Batch insert options with table, columns, and rows
   * @returns Promise resolving to batch operation result
   */
  async batchInsert(_options) {
    throw new NotImplementedError(
      "client.batchInsert is removed \u2014 gateway v2 has no /batch/insert route. Use client.executeBatchQueries({ queries: [...] }) (POST /query/execute/batch) with INSERT statements instead."
    );
  }
  /**
   * Performs batch update operations.
   * @deprecated No `/batch/update` route in gateway v2.
   */
  async batchUpdate(_options) {
    throw new NotImplementedError(
      "client.batchUpdate is removed \u2014 gateway v2 has no /batch/update route. Use client.executeBatchQueries({ queries: [...] }) with UPDATE statements instead."
    );
  }
  /**
   * Performs batch delete operations.
   * @deprecated No `/batch/delete` route in gateway v2.
   */
  async batchDelete(_options) {
    throw new NotImplementedError(
      "client.batchDelete is removed \u2014 gateway v2 has no /batch/delete route. Use client.executeBatchQueries({ queries: [...] }) with DELETE statements instead."
    );
  }
  // =================================================================
  // ADVANCED SQL FEATURES
  // =================================================================
  /**
   * Prepares a SQL statement for repeated execution
   * @param sql - SQL statement to prepare
   * @param options - Preparation options
   * @returns Promise resolving to prepared statement
   */
  async prepareStatement(sql, options = {}) {
    const { data } = await this.httpClient.post("/query/prepare", {
      sql,
      name: options.name,
      parameter_types: options.parameterTypes
    });
    const prepared = {
      id: data.statement_id,
      sql,
      parameterCount: data.parameter_count
    };
    if (options.name) {
      this.preparedStatements.set(options.name, prepared);
    }
    return prepared;
  }
  /**
   * Executes a prepared statement with parameters
   * @param statementId - ID of the prepared statement or statement name
   * @param params - Parameters for the prepared statement
   * @returns Promise resolving to query result
   */
  async executePrepared(statementId, params = []) {
    if (this.preparedStatements.has(statementId)) {
      statementId = this.preparedStatements.get(statementId).id;
    }
    const { data } = await this.httpClient.post("/query/exec", {
      statement_id: statementId,
      parameters: params
    });
    return {
      columns: data.columns || [],
      rows: data.rows || [],
      rows_affected: data.rows_affected,
      execution_time_ms: data.execution_time_ms || data.took_ms || 0,
      queryPlan: data.query_plan
    };
  }
  /**
   * Deallocates a prepared statement
   * @param statementId - ID of the prepared statement or statement name
   * @returns Promise resolving when statement is deallocated
   */
  async deallocatePrepared(statementId) {
    if (this.preparedStatements.has(statementId)) {
      const prepared = this.preparedStatements.get(statementId);
      await this.httpClient.post("/query/close", { statement_id: prepared.id });
      this.preparedStatements.delete(statementId);
    } else {
      await this.httpClient.post("/query/close", { statement_id: statementId });
    }
  }
  /**
   * Executes a query with Common Table Expressions (CTEs)
   * @param ctes - Array of CTE definitions
   * @param mainQuery - Main query that uses the CTEs
   * @param params - Optional parameters for the query
   * @returns Promise resolving to query result
   */
  async queryWithCTEs(ctes, mainQuery, params) {
    const cteSQL = ctes.map((cte) => {
      const columns = cte.columns ? `(${cte.columns.join(", ")})` : "";
      return `${cte.name}${columns} AS (${cte.query})`;
    }).join(", ");
    const sql = `WITH ${cteSQL} ${mainQuery}`;
    return this.sql(sql, params);
  }
  /**
   * Executes a query with window functions
   * @param selectQuery - Base SELECT query
   * @param windowFunctions - Array of window function definitions
   * @param params - Optional parameters for the query
   * @returns Promise resolving to query result
   */
  async queryWithWindowFunctions(selectQuery, windowFunctions, params) {
    const windowClauses = windowFunctions.map((wf) => {
      let clause = `${wf.function} OVER (`;
      if (wf.options.partitionBy) {
        clause += `PARTITION BY ${wf.options.partitionBy.join(", ")}`;
      }
      if (wf.options.orderBy) {
        const orderBy = wf.options.orderBy.map((order) => `${order.column} ${order.direction}`).join(", ");
        clause += ` ORDER BY ${orderBy}`;
      }
      if (wf.options.frame) {
        clause += ` ${wf.options.frame.type} BETWEEN ${wf.options.frame.start}`;
        if (wf.options.frame.end) {
          clause += ` AND ${wf.options.frame.end}`;
        }
      }
      clause += `) AS ${wf.alias}`;
      return clause;
    }).join(", ");
    const sql = `${selectQuery}, ${windowClauses}`;
    return this.sql(sql, params);
  }
  /**
   * Performs JSON operations on JSON/JSONB columns
   * @param tableName - Table containing JSON data
   * @param jsonColumn - Name of the JSON column
   * @param operation - JSON operation to perform
   * @param path - JSON path for the operation
   * @param value - Value for update operations
   * @param whereClause - Optional WHERE clause
   * @returns Promise resolving to query result
   */
  async jsonQuery(tableName, jsonColumn, operation, path, value, whereClause) {
    let sql;
    switch (operation) {
      case "extract":
        sql = `SELECT ${jsonColumn}->>'${path}' as extracted_value FROM ${tableName}`;
        break;
      case "update":
        sql = `UPDATE ${tableName} SET ${jsonColumn} = jsonb_set(${jsonColumn}, '{${path}}', '${JSON.stringify(value)}')`;
        break;
      case "delete":
        sql = `UPDATE ${tableName} SET ${jsonColumn} = ${jsonColumn} - '${path}'`;
        break;
      case "contains":
        sql = `SELECT * FROM ${tableName} WHERE ${jsonColumn} @> '{"${path}": ${JSON.stringify(value)}}'`;
        break;
    }
    if (whereClause && operation !== "contains") {
      sql += ` WHERE ${whereClause}`;
    }
    return this.sql(sql);
  }
  /** @deprecated Use `executeQuery("SELECT VECTOR_ADD($1,$2)", …)`. */
  async vectorAdd(_vector1, _vector2) {
    throw new NotImplementedError(
      "client.vectorAdd is removed \u2014 " + _SynapCores.VECTOR_ALGEBRA_HINT
    );
  }
  /** @deprecated Use `executeQuery("SELECT VECTOR_SUBTRACT($1,$2)", …)`. */
  async vectorSubtract(_vector1, _vector2) {
    throw new NotImplementedError(
      "client.vectorSubtract is removed \u2014 " + _SynapCores.VECTOR_ALGEBRA_HINT
    );
  }
  /** @deprecated Use `executeQuery("SELECT VECTOR_SCALAR_MULTIPLY($1,$2)", …)`. */
  async vectorScalarMultiply(_vector, _scalar) {
    throw new NotImplementedError(
      "client.vectorScalarMultiply is removed \u2014 " + _SynapCores.VECTOR_ALGEBRA_HINT
    );
  }
  /** @deprecated Use `executeQuery("SELECT INNER_PRODUCT($1,$2)", …)`. */
  async vectorDotProduct(_vector1, _vector2) {
    throw new NotImplementedError(
      "client.vectorDotProduct is removed \u2014 " + _SynapCores.VECTOR_ALGEBRA_HINT
    );
  }
  /** @deprecated Use `executeQuery("SELECT COSINE_SIMILARITY($1,$2)", …)`. */
  async cosineSimilarity(_vector1, _vector2) {
    throw new NotImplementedError(
      "client.cosineSimilarity is removed \u2014 " + _SynapCores.VECTOR_ALGEBRA_HINT
    );
  }
  /** @deprecated Use `executeQuery("SELECT L2_DISTANCE($1,$2)", …)`. */
  async l2Distance(_vector1, _vector2) {
    throw new NotImplementedError(
      "client.l2Distance is removed \u2014 " + _SynapCores.VECTOR_ALGEBRA_HINT
    );
  }
  /** @deprecated Use `executeQuery("SELECT INNER_PRODUCT($1,$2)", …)`. */
  async innerProduct(_vector1, _vector2) {
    throw new NotImplementedError(
      "client.innerProduct is removed \u2014 " + _SynapCores.VECTOR_ALGEBRA_HINT
    );
  }
  /**
   * @deprecated No `/vectors/knn-search` route on gateway v2. Use an ORDER BY
   * distance query, e.g.
   * `executeQuery("SELECT id FROM t ORDER BY L2_DISTANCE(embedding, $1) LIMIT $2", …)`,
   * or the collection-based vector search under /vectors/collections/:c/search.
   */
  async knnSearch(_options) {
    throw new NotImplementedError(
      'client.knnSearch is removed \u2014 no /vectors/knn-search route on gateway v2. Use executeQuery("SELECT ... ORDER BY L2_DISTANCE(col, $1) LIMIT $2", \u2026) or POST /vectors/collections/:c/search.'
    );
  }
  /** @deprecated No `/vectors/range-search` route on gateway v2 — use a WHERE + ORDER BY distance query. */
  async rangeSearch(_options) {
    throw new NotImplementedError(
      'client.rangeSearch is removed \u2014 no /vectors/range-search route on gateway v2. Use executeQuery("SELECT ... WHERE COSINE_SIMILARITY(col, $1) >= $2", \u2026).'
    );
  }
  /** @deprecated No `/vectors/hybrid-search` route on gateway v2 — combine WHERE + ORDER BY distance in one SQL query. */
  async hybridSearch(_options) {
    throw new NotImplementedError(
      "client.hybridSearch is removed \u2014 no /vectors/hybrid-search route on gateway v2. Combine a SQL filter with ORDER BY COSINE_SIMILARITY(col, $1) in one executeQuery() call."
    );
  }
  /** @deprecated Use `executeQuery("SELECT VECTOR_NORMALIZE($1)", …)`. */
  async normalizeVector(_vector) {
    throw new NotImplementedError(
      "client.normalizeVector is removed \u2014 " + _SynapCores.VECTOR_ALGEBRA_HINT
    );
  }
  /** @deprecated Use `executeQuery("SELECT VECTOR_MAGNITUDE($1)", …)`. */
  async vectorMagnitude(_vector) {
    throw new NotImplementedError(
      "client.vectorMagnitude is removed \u2014 " + _SynapCores.VECTOR_ALGEBRA_HINT
    );
  }
  // =================================================================
  // AUTHENTICATION & USER MANAGEMENT
  // =================================================================
  /**
   * Register a new user
   */
  async registerUser(request) {
    const { data } = await this.httpClient.post("/auth/register", {
      username: request.username,
      email: request.email,
      password: request.password
    });
    return data;
  }
  /**
   * Login with username and password
   */
  async login(request) {
    const { data } = await this.httpClient.post("/auth/login", {
      username: request.username,
      password: request.password
    });
    if (data.access_token) {
      this.config.jwtToken = data.access_token;
      this.httpClient.defaults.headers["Authorization"] = `Bearer ${data.access_token}`;
      delete this.httpClient.defaults.headers["X-API-Key"];
    }
    return data;
  }
  /**
   * Refresh JWT token
   */
  async refreshToken() {
    throw new NotImplementedError(
      "client.refreshToken is removed \u2014 gateway v2 has no /auth/refresh route. Re-authenticate with client.login({ username, password }) to obtain a fresh access token."
    );
  }
  /**
   * Set JWT token manually (useful after login)
   */
  setJWTToken(token) {
    this.config.jwtToken = token;
    this.httpClient.defaults.headers["Authorization"] = `Bearer ${token}`;
    delete this.httpClient.defaults.headers["X-API-Key"];
  }
  /**
   * Clear authentication (logout)
   */
  logout() {
    this.config.jwtToken = "";
    delete this.httpClient.defaults.headers["Authorization"];
    delete this.httpClient.defaults.headers["X-API-Key"];
  }
  // =================================================================
  // API KEY MANAGEMENT
  // =================================================================
  /**
   * Create a new API key
   */
  async createAPIKey(request) {
    const { data } = await this.httpClient.post("/api-keys", {
      name: request.name,
      permission: request.permission,
      expires_in_days: request.expires_in_days
    });
    return data;
  }
  /**
   * List all API keys
   */
  async listAPIKeys() {
    const { data } = await this.httpClient.get("/api-keys");
    return data;
  }
  /**
   * Get API key statistics
   */
  async getAPIKeyStats(_keyId) {
    const { data } = await this.httpClient.get("/api-keys/stats");
    return data;
  }
  /**
   * Revoke (delete) an API key
   */
  async revokeAPIKey(keyId) {
    await this.httpClient.delete(`/api-keys/${keyId}`);
  }
  // =================================================================
  // MULTIMEDIA MANAGEMENT
  // =================================================================
  /**
   * Upload multimedia file to a document
   */
  async uploadMultimedia(collection, documentId, file, metadata) {
    let FormDataClass;
    try {
      FormDataClass = __require("form-data");
    } catch {
      FormDataClass = FormData;
    }
    const formData = new FormDataClass();
    if (Buffer.isBuffer(file)) {
      formData.append("file", file, { filename: "upload" });
    } else {
      formData.append("file", file);
    }
    if (metadata) {
      formData.append("metadata", JSON.stringify(metadata));
    }
    const headers = {};
    if (typeof formData.getHeaders === "function") {
      Object.assign(headers, formData.getHeaders());
    }
    const { data } = await this.httpClient.post(
      `/multimedia/${collection}/documents/${documentId}/multimedia`,
      formData,
      {
        headers
      }
    );
    return data;
  }
  /**
   * Get multimedia file URL (for viewing/downloading)
   */
  getMultimediaUrl(collection, documentId, multimediaId, download = false) {
    const protocol = this.config.useHttps ? "https" : "http";
    const baseUrl = `${protocol}://${this.config.host}:${this.config.port}/v1`;
    return `${baseUrl}/multimedia/${collection}/documents/${documentId}/multimedia/${multimediaId}${download ? "?download=true" : ""}`;
  }
  /**
   * Get multimedia thumbnail URL
   */
  getMultimediaThumbnailUrl(collection, documentId, multimediaId) {
    const protocol = this.config.useHttps ? "https" : "http";
    const baseUrl = `${protocol}://${this.config.host}:${this.config.port}/v1`;
    return `${baseUrl}/multimedia/${collection}/documents/${documentId}/multimedia/${multimediaId}/thumbnail`;
  }
  /**
   * List multimedia files in a document
   */
  async listMultimedia(collection, documentId, limit = 50, offset = 0) {
    const { data } = await this.httpClient.get(
      `/multimedia/${collection}/documents/${documentId}/multimedia?limit=${limit}&offset=${offset}`
    );
    return data;
  }
  /**
   * Get multimedia file information
   */
  async getMultimedia(collection, documentId, multimediaId) {
    const { data } = await this.httpClient.get(
      `/multimedia/${collection}/documents/${documentId}/multimedia/${multimediaId}`
    );
    return data;
  }
  /**
   * Delete multimedia file
   */
  async deleteMultimedia(collection, documentId, multimediaId) {
    await this.httpClient.delete(`/multimedia/${collection}/documents/${documentId}/multimedia/${multimediaId}`);
  }
};
// =================================================================
// VECTOR OPERATIONS
// =================================================================
// NOTE (0.6.0 reconciliation): the standalone per-operation vector-algebra
// routes (`/vectors/add`, `/vectors/cosine-similarity`, `/vectors/knn-search`,
// …) do NOT exist on the gateway v2 surface served at /v1. Vector math moved
// to first-class SQL functions — COSINE_SIMILARITY, L2_DISTANCE,
// INNER_PRODUCT, VECTOR_ADD, VECTOR_SUBTRACT, VECTOR_NORMALIZE,
// VECTOR_MAGNITUDE, etc. — reachable via client.executeQuery(). Batch/project
// vector ops live under POST /vector-algebra/operation. Each helper below
// therefore throws NotImplementedError with the SQL replacement rather than
// silently 404-ing.
_SynapCores.VECTOR_ALGEBRA_HINT = 'Vector algebra moved to SQL functions on gateway v2. Use client.executeQuery("SELECT COSINE_SIMILARITY($1, $2)", { parameters: [a, b] }) and the sibling functions (L2_DISTANCE, INNER_PRODUCT, VECTOR_ADD, VECTOR_SUBTRACT, VECTOR_SCALAR_MULTIPLY, VECTOR_NORMALIZE, VECTOR_MAGNITUDE), or POST /vector-algebra/operation for batch ops.';
var SynapCores = _SynapCores;

// src/index.ts
import { z } from "zod";
var VERSION = "0.6.0";
export {
  AuthenticationError,
  AutoMLClient,
  AutoMLModel,
  BackupClient,
  BatchOperationError,
  Collection,
  ConnectionError,
  ImportExportClient,
  IntegrationClient,
  MemoryClient,
  MemoryError,
  NLPClient,
  NotFoundError,
  NotImplementedError,
  RateLimitError,
  RecipeClient,
  SQLError,
  SchemaClient,
  ServerError,
  Subscription,
  SynapCores,
  SynapCoresError,
  TimeoutError,
  TransactionError,
  VERSION,
  ValidationError,
  VectorError,
  z
};
//# sourceMappingURL=index.mjs.map