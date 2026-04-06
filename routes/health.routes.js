import express from 'express';
import { checkHealth } from '../controllers/health.controller.js';

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Get API health status
 * @access  Public
 */
router.get('/', checkHealth);

export default router;
