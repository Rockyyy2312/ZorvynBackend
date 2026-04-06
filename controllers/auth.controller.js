import * as authService from '../services/auth.service.js';

export const register = async (req, res, next) => {
    try {
        const result = await authService.registerUser(req.body);
        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        if (error.message === 'User already exists') {
            res.status(400);
        }
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400);
            throw new Error('Please provide an email and password');
        }

        const result = await authService.loginUser(email, password);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        if (error.message === 'Invalid email or password' || error.message === 'User account is deactivated') {
            res.status(401);
        }
        next(error);
    }
};
