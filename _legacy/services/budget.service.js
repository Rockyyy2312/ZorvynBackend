import Budget from '../models/budget.model.js';
import AppError from '../utils/AppError.js';

export const createBudget = async (data, userId) => {
    try {
        const budget = await Budget.create({ ...data, user: userId });
        return budget;
    } catch (error) {
        if (error.code === 11000) {
            throw new AppError(`Budget for category "${data.category}" already exists`, 400);
        }
        throw error;
    }
};

export const getBudgets = async (user) => {
    let query = {};
    if (user.role !== 'admin') {
        query.user = user._id;
    }
    const budgets = await Budget.find(query).populate('user', 'name email');
    return budgets;
};

export const getBudgetById = async (id, user) => {
    const budget = await Budget.findById(id).populate('user', 'name email');
    if (!budget) throw new AppError('Budget not found', 404);

    if (user.role !== 'admin' && budget.user._id.toString() !== user._id.toString()) {
        throw new AppError('Not authorized to access this budget', 403);
    }
    return budget;
};

export const updateBudget = async (id, data, user) => {
    await getBudgetById(id, user);
    try {
        const updatedBudget = await Budget.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true, runValidators: true }
        ).populate('user', 'name email');
        return updatedBudget;
    } catch (error) {
        if (error.code === 11000) {
            throw new AppError(`Budget for category "${data.category}" already exists`, 400);
        }
        throw error;
    }
};

export const deleteBudget = async (id, user) => {
    const budget = await getBudgetById(id, user);
    await budget.deleteOne();
    return { message: 'Budget removed successfully' };
};
