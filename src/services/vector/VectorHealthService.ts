import { vectorService } from '../vectorService';
import { logger } from '../../lib/logger';

export class VectorHealthService {
  private isVectorServiceHealthy = false;
  private healthCheckPromise: Promise<void>;

  constructor() {
    this.healthCheckPromise = this.checkVectorServiceHealth();
  }

  private async checkVectorServiceHealth(): Promise<void> {
    try {
      this.isVectorServiceHealthy = await vectorService.isHealthy();
    } catch (error) {
      logger.error('Vector service health check failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorHealthService',
        action: 'checkHealth',
      });
      this.isVectorServiceHealthy = false;
    }
  }

  async waitForHealthCheck(): Promise<boolean> {
    await this.healthCheckPromise;
    return this.isVectorServiceHealthy;
  }

  isHealthy(): boolean {
    return this.isVectorServiceHealthy;
  }

  async refreshHealth(): Promise<boolean> {
    await this.checkVectorServiceHealth();
    return this.isVectorServiceHealthy;
  }
}