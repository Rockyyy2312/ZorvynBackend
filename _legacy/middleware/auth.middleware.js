import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { config } from '../config/env.js';

/**
 * Protect routes by extracting and validating the JWT token
 */
export const protect = async (req, res, next) => {
    let token;

    // Extract from Bearer token
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, config.jwtSecret);

            // Attach user object to request
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                res.status(401);
                throw new Error('User not found with this token');
            }

            next();
        } catch (error) {
            res.status(401);
            next(new Error('Not authorized, token failed'));
        }
    } else {
        res.status(401);
        next(new Error('Not authorized, no token provided'));
    }
};

/**
 * RBAC - Role Based Access Control matching logic
 * Pass array of roles authorized to view the specific route.
 */
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403);
            return next(new Error(`User role '${req.user ? req.user.role : 'Unknown'}' is not authorized to access this route`));
        }
        next();
    };
};
