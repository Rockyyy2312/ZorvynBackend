import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Generate JWT passing user ID and role
 */
export const generateToken = (id, role) => {
    return jwt.sign({ id, role }, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn,
    });
};
