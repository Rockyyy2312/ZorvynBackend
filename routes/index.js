import express from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import testRoutes from './test.routes.js';
import transactionRoutes from './transaction.routes.js';

const router = express.Router();

// Mount all route modules here
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/test', testRoutes);
router.use('/transactions', transactionRoutes);

export default router;
