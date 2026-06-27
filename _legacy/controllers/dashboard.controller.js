import * as dashboardService from '../services/dashboard.service.js';
import { catchAsync } from '../utils/catchAsync.js';

export const getSummary = catchAsync(async (req, res, next) => {
    const data = await dashboardService.getSummary(req.user, req.query);
    res.status(200).json(data);
});

export const getCategories = catchAsync(async (req, res, next) => {
    const data = await dashboardService.getCategories(req.user, req.query);
    res.status(200).json({ success: true, data });
});

export const getMonthlyTrends = catchAsync(async (req, res, next) => {
    const data = await dashboardService.getMonthlyTrends(req.user, req.query);
    res.status(200).json({ success: true, data });
});

export const getRecentTransactions = catchAsync(async (req, res, next) => {
    const data = await dashboardService.getRecentTransactions(req.user, req.query);
    res.status(200).json({ success: true, count: data.length, data });
});

export const getOverview = catchAsync(async (req, res, next) => {
    const data = await dashboardService.getOverview(req.user, req.query);
    res.status(200).json({ success: true, data });
});
