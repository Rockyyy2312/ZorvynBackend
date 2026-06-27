import express from 'express';
import { protect, authorizeRoles } from '../middleware/auth.middleware.js';
import { create, getAll, getById, update, remove } from '../controllers/budget.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { createBudgetSchema, updateBudgetSchema } from '../validations/budget.validation.js';

const router = express.Router();

router.use(protect);

router.post('/', authorizeRoles('admin', 'analyst', 'viewer'), validate(createBudgetSchema), create);
router.get('/', authorizeRoles('admin', 'analyst', 'viewer'), getAll);
router.get('/:id', authorizeRoles('admin', 'analyst', 'viewer'), getById);
router.put('/:id', authorizeRoles('admin', 'analyst', 'viewer'), validate(updateBudgetSchema), update);
router.delete('/:id', authorizeRoles('admin', 'analyst', 'viewer'), remove);

export default router;
