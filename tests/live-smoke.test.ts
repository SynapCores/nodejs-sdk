/**
 * Live smoke test for @synapcores/sdk against a running gateway.
 *
 * Gated on AIDB_LIVE_TEST=1 so it never runs by accident in unit-test CI.
 * Required env:
 *   AIDB_LIVE_TEST=1
 *   AIDB_JWT=<bearer token>
 * Optional env:
 *   AIDB_HOST   (default 127.0.0.1)
 *   AIDB_PORT   (default 28095)
 *
 * Mirrors /home/devops/scratch/sdk-validation-npm/validate.ts so a regression
 * in any of the 9 surface tests fails CI rather than at customer-install time.
 */

import { SynapCores } from '../src';

const LIVE = process.env.AIDB_LIVE_TEST === '1';
const JWT = process.env.AIDB_JWT || '';
const HOST = process.env.AIDB_HOST || '127.0.0.1';
const PORT = Number(process.env.AIDB_PORT || '28095');

// jest's describe.skip when LIVE is off keeps the file legal in normal runs.
const d = LIVE && JWT ? describe : describe.skip;

d('live gateway smoke (AIDB_LIVE_TEST=1)', () => {
  let c: SynapCores;

  beforeAll(() => {
    c = new SynapCores({ host: HOST, port: PORT, jwtToken: JWT, useHttps: false });
  });

  it('1. sql("SELECT 1")', async () => {
    const r = await (c as any).sql('SELECT 1 as one');
    expect(r).toBeDefined();
  });

  it('2. executeQuery returns rows', async () => {
    const r = await (c as any).executeQuery({ sql: 'SELECT 1 as one', parameters: [] });
    expect(r).toHaveProperty('rows');
  });

  it('3. listCollections() returns string[]', async () => {
    const r = await c.listCollections();
    expect(Array.isArray(r)).toBe(true);
  });

  it('4. graph.cypher (no params)', async () => {
    const r = await c.graph.cypher('MATCH (n) RETURN n LIMIT 1');
    expect(r).toBeDefined();
  });

  it('6. graph.graphs.list()', async () => {
    const r = await (c.graph as any).graphs.list();
    expect(Array.isArray(r)).toBe(true);
  });

  it('7. automl.listModels()', async () => {
    const r = await c.automl.listModels();
    expect(Array.isArray(r)).toBe(true);
  });

  it('8. automl.getModel("mcp_churn").predict(...)', async () => {
    const m = await c.automl.getModel('mcp_churn');
    const r = await m.predict([
      { tenure_months: 41, visits_30d: 3, spend_30d: 12.51 },
    ]);
    expect(r).toBeDefined();
  });

  it('9. collection("verify_members").vectorSearch(...)', async () => {
    const coll = (c as any).collection('verify_members');
    const r = await coll.vectorSearch({
      vector: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.0],
      topK: 3,
    });
    expect(r).toHaveProperty('documents');
    expect(Array.isArray(r.documents)).toBe(true);
  });

  // Test 5 (Cypher with $param) is a known gateway-side bug — intentionally
  // omitted until the gateway parser ships its fix.
});
