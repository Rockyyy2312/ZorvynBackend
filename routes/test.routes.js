import express from 'express';
import { protect, authorizeRoles } from '../middleware/auth.middleware.js';
import { adminContent, analystContent, viewerContent } from '../controllers/test.controller.js';

const router = express.Router();

// Apply protect middleware to all routes in this file
router.use(protect);

// GET /api/test/admin -> only admin
router.get('/admin', authorizeRoles('admin'), adminContent);

// GET /api/test/analyst -> admin + analyst
router.get('/analyst', authorizeRoles('admin', 'analyst'), analystContent);

// GET /api/test/viewer -> all roles (admin, analyst, viewer)
router.get('/viewer', authorizeRoles('admin', 'analyst', 'viewer'), viewerContent);

export default router;
