import express from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import testRoutes from './test.routes.js';
import transactionRoutes from './transaction.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import budgetRoutes from './budget.routes.js';

const router = express.Router();

// Mount all route modules here
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/test', testRoutes);
router.use('/transactions', transactionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/budgets', budgetRoutes);

export default router;
