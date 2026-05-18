# Changelog

All notable changes to `@synapcores/sdk` are documented here.
This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
