export interface HealthResponse {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

export class HealthService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
