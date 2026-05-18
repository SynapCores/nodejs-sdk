/**
 * System / admin client for SynapCores SDK (v1.5.0-ce).
 *
 * Currently only the vision provider config surface is exposed:
 *   GET/PUT/DELETE /v1/system/vision
 *   POST /v1/system/vision/test
 */

import { SynapCores } from './client';
import { VisionConfig, VisionTestResult } from './types/system';

class VisionApi {
  constructor(private readonly synapCores: SynapCores) {}

  async get(): Promise<VisionConfig | null> {
    try {
      const { data } = await this.synapCores._getHttpClient().get('/system/vision');
      if (!data || (Object.keys(data).length === 0)) return null;
      return data as VisionConfig;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.code === 'NOT_FOUND') return null;
      throw e;
    }
  }

  async set(cfg: VisionConfig): Promise<VisionConfig> {
    const { data } = await this.synapCores._getHttpClient().put('/system/vision', cfg);
    return data as VisionConfig;
  }

  async delete(): Promise<void> {
    await this.synapCores._getHttpClient().delete('/system/vision');
  }

  async test(payload: any = {}): Promise<VisionTestResult> {
    const { data } = await this.synapCores._getHttpClient().post('/system/vision/test', payload);
    return {
      success: data.success ?? false,
      latency_ms: data.latency_ms,
      response: data.response,
      error: data.error,
    };
  }
}

export class SystemClient {
  public readonly vision: VisionApi;

  constructor(synapCores: SynapCores) {
    this.vision = new VisionApi(synapCores);
  }
}
