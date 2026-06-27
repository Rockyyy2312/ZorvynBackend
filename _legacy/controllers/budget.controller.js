import * as budgetService from '../services/budget.service.js';
import { catchAsync } from '../utils/catchAsync.js';

export const create = catchAsync(async (req, res, next) => {
    const result = await budgetService.createBudget(req.body, req.user._id);
    res.status(201).json({ success: true, data: result });
});

export const getAll = catchAsync(async (req, res, next) => {
    const result = await budgetService.getBudgets(req.user);
    res.status(200).json({ success: true, data: result });
});

export const getById = catchAsync(async (req, res, next) => {
    const result = await budgetService.getBudgetById(req.params.id, req.user);
    res.status(200).json({ success: true, data: result });
});

export const update = catchAsync(async (req, res, next) => {
    const result = await budgetService.updateBudget(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data: result });
});

export const remove = catchAsync(async (req, res, next) => {
    const result = await budgetService.deleteBudget(req.params.id, req.user);
    res.status(200).json({ success: true, message: result.message });
});
