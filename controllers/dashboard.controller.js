import * as dashboardService from '../services/dashboard.service.js';

export const getSummary = async (req, res, next) => {
    try {
        const data = await dashboardService.getSummary(req.user, req.query);
        // Returning exactly the requested clean JSON format
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

export const getCategories = async (req, res, next) => {
    try {
        const data = await dashboardService.getCategories(req.user, req.query);
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const getMonthlyTrends = async (req, res, next) => {
    try {
        const data = await dashboardService.getMonthlyTrends(req.user, req.query);
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const getRecentTransactions = async (req, res, next) => {
    try {
        const data = await dashboardService.getRecentTransactions(req.user, req.query);
        res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        next(error);
    }
};

export const getOverview = async (req, res, next) => {
    try {
        const data = await dashboardService.getOverview(req.user, req.query);
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};
