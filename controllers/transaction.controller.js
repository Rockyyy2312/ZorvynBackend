import * as transactionService from '../services/transaction.service.js';

export const create = async (req, res, next) => {
    try {
        const result = await transactionService.createTransaction(req.body, req.user._id);
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        if (error.message.startsWith('Please provide')) res.status(400);
        next(error);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const result = await transactionService.getTransactions(req.query, req.user);
        res.status(200).json({ success: true, count: result.length, data: result });
    } catch (error) {
        next(error);
    }
};

export const getById = async (req, res, next) => {
    try {
        const result = await transactionService.getTransactionById(req.params.id, req.user);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        if (error.message === 'Transaction not found') res.status(404);
        if (error.name === 'CastError') {
            res.status(400);
            error.message = 'Invalid Transaction ID';
        }
        if (error.message === 'Not authorized to access this transaction') res.status(403);
        next(error);
    }
};

export const update = async (req, res, next) => {
    try {
        const result = await transactionService.updateTransaction(req.params.id, req.body, req.user);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        if (error.message === 'Transaction not found') res.status(404);
        if (error.name === 'CastError') {
            res.status(400);
            error.message = 'Invalid Transaction ID';
        }
        next(error);
    }
};

export const remove = async (req, res, next) => {
    try {
        const result = await transactionService.deleteTransaction(req.params.id, req.user);
        res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        if (error.message === 'Transaction not found') res.status(404);
        if (error.name === 'CastError') {
            res.status(400);
            error.message = 'Invalid Transaction ID';
        }
        next(error);
    }
};
