import * as authService from '../services/auth.service.js';
import { catchAsync } from '../utils/catchAsync.js';

export const register = catchAsync(async (req, res, next) => {
    const result = await authService.registerUser(req.body);
    res.status(201).json({
        success: true,
        data: result
    });
});

export const login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    res.status(200).json({
        success: true,
        data: result
    });
});
