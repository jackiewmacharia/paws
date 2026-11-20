import { Router } from 'express';
import type { HealthService } from './health.service';

export function createHealthRouter(healthService: HealthService): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(healthService.getHealth());
  });

  return router;
}
