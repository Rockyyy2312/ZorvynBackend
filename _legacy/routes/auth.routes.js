import express from 'express';
import { login, register } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { loginSchema, registerSchema } from '../validations/auth.validation.js';

const router = express.Router();

// Assign exact schema parsing validations natively guarding raw implementations
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

export default router;
