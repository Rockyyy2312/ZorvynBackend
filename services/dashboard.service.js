import Transaction from '../models/transaction.model.js';
import mongoose from 'mongoose';

// Reusable function to calculate the Match stage across aggregations
// Honors Ownership rules and bonus Date configurations
const getMatchStage = (user, queryParams = {}) => {
    const matchStage = {};

    // Ownership constraints logic
    if (user.role !== 'admin') {
        matchStage.user = new mongoose.Types.ObjectId(user._id);
    }

    // Date range filtering (Bonus)
    if (queryParams.startDate || queryParams.endDate) {
        matchStage.date = {};
        if (queryParams.startDate) matchStage.date.$gte = new Date(queryParams.startDate);
        if (queryParams.endDate) matchStage.date.$lte = new Date(queryParams.endDate);
    }
    return matchStage;
};

/**
 * Get Net Balance Summary calculations
 */
export const getSummary = async (user, queryParams) => {
    const matchStage = getMatchStage(user, queryParams);

    const aggregation = await Transaction.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalIncome: {
                    $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] }
                },
                totalExpense: {
                    $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] }
                }
            }
        }
    ]);

    if (aggregation.length === 0) {
        return { totalIncome: 0, totalExpense: 0, netBalance: 0 };
    }

    const { totalIncome, totalExpense } = aggregation[0];
    return {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense
    };
};

/**
 * Breakdown totals categorically
 */
export const getCategories = async (user, queryParams) => {
    const matchStage = getMatchStage(user, queryParams);

    const aggregation = await Transaction.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: { category: "$category", type: "$type" },
                totalAmount: { $sum: "$amount" }
            }
        },
        { $sort: { totalAmount: -1 } },
        {
            $group: {
                _id: "$_id.type",
                categories: {
                    $push: { category: "$_id.category", amount: "$totalAmount" }
                }
            }
        }
    ]);

    const result = { income: [], expense: [] };
    aggregation.forEach(group => {
        result[group._id] = group.categories;
    });

    return result;
};

/**
 * Generate monthly trends timeline mapped effectively
 */
export const getMonthlyTrends = async (user, queryParams) => {
    const matchStage = getMatchStage(user, queryParams);

    const aggregation = await Transaction.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: {
                    year: { $year: "$date" },
                    month: { $month: "$date" }
                },
                totalIncome: {
                    $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] }
                },
                totalExpense: {
                    $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] }
                }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        {
            $project: {
                _id: 0,
                year: "$_id.year",
                month: "$_id.month",
                totalIncome: 1,
                totalExpense: 1,
                netBalance: { $subtract: ["$totalIncome", "$totalExpense"] }
            }
        }
    ]);

    return aggregation;
};

/**
 * Quick retrieval mapping limit queries safely
 */
export const getRecentTransactions = async (user, queryParams) => {
    const matchStage = getMatchStage(user, queryParams);

    const transactions = await Transaction.find(matchStage)
        .sort({ date: -1 })
        .limit(10)
        .populate('user', 'name email');

    return transactions;
};

/**
 * Unified Overview Data Fetching Algorithm (Bonus)
 * Parallels computations for absolute optimization
 */
export const getOverview = async (user, queryParams) => {
    const [summary, categories, monthly, recent] = await Promise.all([
        getSummary(user, queryParams),
        getCategories(user, queryParams),
        getMonthlyTrends(user, queryParams),
        getRecentTransactions(user, queryParams)
    ]);

    return { summary, categories, monthly, recent };
};
