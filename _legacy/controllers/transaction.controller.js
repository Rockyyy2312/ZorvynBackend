import * as transactionService from '../services/transaction.service.js';
import { catchAsync } from '../utils/catchAsync.js';

export const create = catchAsync(async (req, res, next) => {
    const result = await transactionService.createTransaction(req.body, req.user._id);
    res.status(201).json({ success: true, data: result });
});

export const getAll = catchAsync(async (req, res, next) => {
    const { data, pagination, count } = await transactionService.getTransactions(req.query, req.user);
    res.status(200).json({ success: true, count, pagination, data });
});

export const getById = catchAsync(async (req, res, next) => {
    const result = await transactionService.getTransactionById(req.params.id, req.user);
    res.status(200).json({ success: true, data: result });
});

export const update = catchAsync(async (req, res, next) => {
    const result = await transactionService.updateTransaction(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data: result });
});

export const remove = catchAsync(async (req, res, next) => {
    const result = await transactionService.deleteTransaction(req.params.id, req.user);
    res.status(200).json({ success: true, message: result.message });
});
