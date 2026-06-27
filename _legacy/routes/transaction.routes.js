import express from 'express';
import { protect, authorizeRoles } from '../middleware/auth.middleware.js';
import { create, getAll, getById, update, remove } from '../controllers/transaction.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { createTransactionSchema, getTransactionsQuerySchema } from '../validations/transaction.validation.js';

const router = express.Router();

router.use(protect);

// Applied Zod parsing querying configurations globally allowing safe searching natively
router.get('/', authorizeRoles('admin', 'analyst', 'viewer'), validate(getTransactionsQuerySchema), getAll);
router.get('/:id', authorizeRoles('admin', 'analyst', 'viewer'), getById);

// Mapping explicit body checking properties isolating errors beforehand 
router.post('/', authorizeRoles('admin'), validate(createTransactionSchema), create);
router.put('/:id', authorizeRoles('admin'), validate(createTransactionSchema), update);
router.delete('/:id', authorizeRoles('admin'), remove);

export default router;
