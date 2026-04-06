import express from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import testRoutes from './test.routes.js';

const router = express.Router();

// Mount all route modules here
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/test', testRoutes);

export default router;
