import express from 'express';
import { protect, authorizeRoles } from '../middleware/auth.middleware.js';
import { create, getAll, getById, update, remove } from '../controllers/transaction.controller.js';

const router = express.Router();

// Apply global protect middleware requiring JWT auth
router.use(protect);

// GET /api/transactions -> Access: admin, analyst, viewer
router.get('/', authorizeRoles('admin', 'analyst', 'viewer'), getAll);

// GET /api/transactions/:id -> Access: admin, analyst, viewer
router.get('/:id', authorizeRoles('admin', 'analyst', 'viewer'), getById);

// POST /api/transactions -> Access: admin only
router.post('/', authorizeRoles('admin'), create);

// PUT /api/transactions/:id -> Access: admin only
router.put('/:id', authorizeRoles('admin'), update);

// DELETE /api/transactions/:id -> Access: admin only
router.delete('/:id', authorizeRoles('admin'), remove);

export default router;
