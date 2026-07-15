# Changelog

## 0.6.1

Docs-only. README aligned with the 0.6.0 gateway-v2 reconciliation: removed
deprecated examples (vector-algebra helpers, `batch*`, `refreshToken`,
`nlp.analyze`, `collection.search`) that now throw `NotImplementedError`, added a
"Removed method → Use instead" migration table, corrected auth to
`Authorization: Bearer`, fixed `embed()` to `/ai/embeddings`, and documented the
recipes / prepared-statements / schema surfaces. No code or API changes vs 0.6.0.

## 0.6.0

Full route reconciliation against the gateway v2 API surface (the default
served at `/v1`). Every SDK method now maps to a real gateway route or throws
a typed `NotImplementedError` naming the supported alternative — no method
silently 404s. A new `NotImplementedError` (code `NOT_IMPLEMENTED`) is exported.

### Re-routed (path and/or request/response shape corrected)

- **AutoML** — moved off the AI namespace onto `/automl/*`:
  `train` → `POST /automl/train`; `trainAsync` → `POST /automl/train` with
  `async_mode:true`; `getModel`/`listModels` → `/automl/models[/:id]`
  (`listModels` now tolerates a bare-array response); `AutoMLModel.predict` →
  `POST /automl/models/:id/predict`; `AutoMLModel.evaluate` →
  `POST /automl/models/:id/evaluate`; `AutoMLModel.delete` →
  `DELETE /automl/models/:id`; `getTrainingJob`/`listTrainingJobs` →
  `/automl/jobs[/:id]`; `cancelTrainingJob` → `POST /automl/jobs/:id/stop`.
- **NLP** — `sentiment`, `classify`, `extractEntities`, `summarize` now use the
  single-`text` request shape ai_v2 actually serves (they previously sent a
  `texts` array and 422'd) and parse the real response fields
  (`sentiment`/`scores`, `entity_type`/`confidence`, `classifications[]`).
- **Prepared statements** — `prepareStatement` → `POST /query/prepare`;
  `executePrepared` → `POST /query/exec`; `deallocatePrepared` →
  `POST /query/close`.
- **Backup** — rebuilt for backup_v2 (nested at `/backup`): create/list/get/
  delete on `/backup/backups[/:id]`, `restore` → `POST /backup/restore`,
  `getRestoreStatus` → `GET /backup/restore/:id/status`, `download`, and
  schedules on `/backup/schedules[/:id]`. `getBackupStatus` reads status from
  the backup record.
- **Import** — `import()` → `POST /data/import/{csv,json}` (multipart, chosen by
  `format`) with the handler's field names (`table`→`table_name`,
  `skip_header`→`has_headers`, `primary_keys`→`primary_key`).
- **Integrations** — remapped to the type-keyed config surface: `create`/
  `update` → `POST /integrations/:type`, `get`/`delete` → `/integrations/:type`,
  `test` → `POST /integrations/:type/test`.
- **Schema** — `describeTable`/introspection use `GET /schema/tables/:name`.
- **Recipes** — `listCategories` → `GET /recipes/categories/counts`.
- **API keys** — `getAPIKeyStats` → `GET /api-keys/stats` (aggregate; there is
  no per-key stats route).
- **Collections** — `Collection.update` uses `PUT` (v2 has no PATCH); bulk
  `insert([...])` and `delete([...])` loop the per-document endpoints (no bulk
  route); collection create/list mapping updated for the v2 payload shapes.

### Deprecated → throw `NotImplementedError` (route removed in gateway v2)

- **Vector algebra** (moved to SQL functions): `vectorAdd`, `vectorSubtract`,
  `vectorScalarMultiply`, `vectorDotProduct`, `cosineSimilarity`, `l2Distance`,
  `innerProduct`, `knnSearch`, `rangeSearch`, `hybridSearch`, `normalizeVector`,
  `vectorMagnitude`. Use `executeQuery("SELECT COSINE_SIMILARITY($1,$2)", …)`.
- **Per-op batch** (use `executeBatchQueries`): `batchInsert`, `batchUpdate`,
  `batchDelete`.
- **Auth**: `refreshToken` (no `/auth/refresh`; re-login instead).
- **Schema**: `getRelationships`, `getStatistics`, `validateSchema`,
  `compareSchemas`, `generateDDL`, `analyzeTable`.
- **Backup**: `updateSchedule`, `activateSchedule`, `deactivateSchedule`,
  `cancelBackup`, `cancelRestore`, `verify`, `getMetrics`.
- **Import/Export**: `export`, `getImportStatus`, `getExportStatus`,
  `cancelImport`, `cancelExport`, `bulkImport`, `validateData`,
  `getImportTemplate`, `listJobs`, `downloadExport`, `streamImport`,
  `streamExport`.
- **Integrations**: `activate`, `deactivate`, `execute`, `getExecutionHistory`,
  `getStats`, `createWebhook`, `listWebhooks`, `deleteWebhook`, `getEvents`,
  `getLogs`, `retryExecution`.
- **AutoML**: `getTrainingMetrics` (no per-job metrics timeline).
- **NLP**: `analyze` (no combined endpoint; call the per-task methods).
- **Collections**: `search`, `vectorSearch`, `query`, `count`, `stats`,
  `createIndex`, `dropIndex` (use `executeQuery` / the vector-collection API).

Validated live against a running gateway: 115/115 methods green — every
reachable method returns a success or a typed 4xx, every deprecated method
throws `NotImplementedError`.

## 0.5.1

- fix: auth Bearer for API keys, restore {data,meta} unwrap, correct /ai/embeddings route — fixes broken 0.5.0 against gateway
  - **Auth:** API keys are now sent as `Authorization: Bearer <key>` (the gateway rejects `X-API-Key` with 401). JWT auth is unchanged.
  - **Envelope:** the response interceptor once again unwraps the gateway's `{ data, meta }` success envelope centrally, so every method and sub-client receives the bare payload (regression from 0.4.2 reintroduced in 0.5.0).
  - **Embeddings:** `embed()` now posts to `POST /v1/ai/embeddings` with the `{ text }` body the gateway accepts (was `POST /ai/embed` with `{ texts }`, which 404'd). Array input embeds each string in turn and returns `number[][]`; single input returns `number[]`.
