# Changelog

All notable changes to `@synapcores/sdk` are documented here.
This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.4.2 — 2026-05-22 — gateway envelope unwrap (fixes `executeQuery`, `sql`, prepared statements, embeddings)

### Fixed

- **`client.executeQuery()` / `client.sql()` / prepared statements now return
  rows.** The gateway wraps every success payload in a uniform envelope —
  `{ data: <payload>, meta: { request_id, timestamp } }` — but several methods
  read fields off the *envelope* (`data.columns`, `data.rows`, …) instead of the
  payload, so they came back `undefined`. This forced consumers to drop down to
  raw HTTP. The response is now unwrapped **once, centrally, in the Axios
  response interceptor**, so every method and sub-client receives the bare
  payload. Methods that already hand-unwrapped (`listCollectionsDetailed`,
  `automl`, vector collections) keep working — their defensive `data?.data ?? data`
  reads are now no-ops. Non-enveloped/streaming responses pass through untouched.
- **`automl.listModels()`** updated to read the unwrapped array shape
  (`data` / `data.items`) with the older nested shapes kept as fallbacks.

### Why this matters

Parameterized queries (`$1` placeholders) are bound **server-side** as of
gateway v1.6.6.6-ce; with this SDK release, `client.executeQuery({ sql, parameters })`
is the correct, injection-safe, end-to-end path — no raw-axios workaround needed.

## 0.4.0 — 2026-05-18 — vector-subsystem + auth alignment with v1.6.5.2-ce gateway

Closes three wire-format gaps surfaced during the OpenClaw v0.1.0 integration.
Validation against `validate-nodejs-sdk-v04.ts` goes from **8/9** under 0.3.0
to **11/12** under 0.4.0 (#5 — Cypher `$param` — remains the documented
gateway-side blocker).

### Fixed

- **Auth: `apiKey` now sends `Authorization: Bearer <key>` instead of
  `X-API-Key`.** Gateway v1.6.5.2-ce only honours the `Authorization`
  header for both JWTs and AIDB-issued API keys (`aidb_*` / `ak_*`);
  the legacy `X-API-Key` shim was rejected with HTTP 401
  `missing_authorization`, forcing callers to manually promote API keys
  into `jwtToken`. The SDK now sends `Bearer` for every credential
  type — `apiKey: 'aidb_...'` Just Works.
- **`Collection.vectorSearch` no longer crosses subsystems** (regression
  guard for callers that relied on the 0.3.0 `client.collection(name)`
  accessor with a vector collection: the search still hits the right
  endpoint regardless of which accessor produced the handle).

### Added

- **`client.createVectorCollection({name, dimensions, distance_metric})`** —
  posts to `POST /v1/vectors/collections` with the gateway's expected
  body shape. The legacy `createCollection({name, vector_size, ...})`
  silently dropped `vector_size` and posted to the document-store
  subsystem, leaving the collection invisible to vector search.
- **`client.vectorCollection(name)`** — synchronous typed handle for an
  existing vector collection. Returns a `VectorCollection` wired to
  `/v1/vectors/collections/{name}/...`, distinct from the document-store
  `client.collection(name)` accessor.
- **`VectorCollection` class** (`src/vector_collection.ts`) — explicit
  vector-subsystem API surface: `insert(records)`, `search({vector, k,
  filter?, includeMetadata?})`, `get(id)`, `delete(id|ids)`, `count()`,
  `info()`. Wire paths target `/v1/vectors/collections/{name}/vectors`
  and `/search`; envelope unwrapping matches the rest of the 0.3.0 SDK.
- **`client.listVectorCollections()`** and
  **`client.deleteVectorCollection(name)`** — sibling helpers for the
  vector subsystem.
- **`tests/live-smoke-v04.test.ts`** — gated on `AIDB_LIVE_TEST=1`,
  runs the 12-test v0.4.0 validation suite against a live gateway.

### Documentation

- README now lists v1.6.5.2-ce as the verified-against gateway version.

## 0.3.0 — 2026-05-18

Wire-alignment release for the v1.6.5.1-ce gateway. Brings the SDK back into sync
with the gateway response shapes and route prefixes that shipped in v1.6.x.

### Fixed

- `client.listCollections()` / `listCollectionsDetailed()` now correctly parse the
  v1.6.x envelope `{ data: { items, total, page, page_size }, meta }`. Previously
  the SDK looked for `data.collections` and threw
  `Cannot read properties of undefined (reading 'map')`.
- `client.graph.graphs.{list,create,get,delete}()` now hit `/v1/graph/graphs`
  (the actual mount point); the old `/v1/graphs` paths 404'd against the v1.6.x
  gateway.
- `client.automl.listModels()` now tolerates the v1.6.x `{ data: [...], meta }`
  envelope (was throwing `(data.models ?? data ?? []).map is not a function`
  because `data` is an object, not an array).
- `client.automl.getModel(id)` no longer hard-fails when the gateway's model
  registry returns 404 for an id whose `/predict` endpoint still works (the
  registry and the predict path can be out of sync after a recipe-loaded model
  is hot-swapped). It now returns a stub `AutoMLModel` so `.predict()` /
  `.evaluate()` still flow through.
- `collection(name).vectorSearch({ vector, topK, filter? })` now posts to
  `POST /v1/vectors/collections/{name}/search` with the gateway's `k` field
  (was using the removed `/collections/{name}/vector_search` route with
  `top_k`).

### Added

- `client.collection(name)` — synchronous accessor returning a `Collection`
  handle without round-tripping to the gateway. Enables one-liner
  `client.collection('docs').vectorSearch({...})`.
- `tests/live-smoke.test.ts` — gated on `AIDB_LIVE_TEST=1`, runs the 9-test
  validation suite against a live gateway so regressions in wire shapes are
  caught in CI rather than at customer-install time.

### Process

- This is the first release where the public `SynapCores/nodejs-sdk` repository
  reflects the code actually shipped to npm. Releases 0.1.0 / 0.2.0 / 0.2.1
  were published directly from an internal workspace and the public repo
  diverged by months. Going forward, all releases must be cut from this repo.

## 0.2.1 — 2026-05-13

- Internal release published from the workspace (not from this repo).

## 0.2.0 — 2026-05-07

- Internal release published from the workspace (not from this repo).
- Migrated `/ai/*` routes to `/automl/*`, added Graph / NL2SQL / Filesystem /
  Chat / Multimodal / System / Transactions / MCP sub-clients.

## 0.1.0 — 2025-10-31

- Initial release.
