import express from 'express';
import healthRoutes from './health.routes.js';

const router = express.Router();

// Mount all route modules here
router.use('/health', healthRoutes);

export default router;
