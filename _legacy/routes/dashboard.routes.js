import express from 'express';
import { protect, authorizeRoles } from '../middleware/auth.middleware.js';
import { getSummary, getCategories, getMonthlyTrends, getRecentTransactions, getOverview } from '../controllers/dashboard.controller.js';

const router = express.Router();

router.use(protect);

// Allow Admin, Analyst, and Viewers 
router.get('/summary', authorizeRoles('admin', 'analyst', 'viewer'), getSummary);
router.get('/recent', authorizeRoles('admin', 'analyst', 'viewer'), getRecentTransactions);

// Allow strictly Admins and Analyst limits
router.get('/categories', authorizeRoles('admin', 'analyst'), getCategories);
router.get('/monthly', authorizeRoles('admin', 'analyst'), getMonthlyTrends);

// Unified Dashboard Bonus Endpoint
router.get('/overview', authorizeRoles('admin', 'analyst'), getOverview);

export default router;
