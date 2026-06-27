import Transaction from '../models/transaction.model.js';
import AppError from '../utils/AppError.js';

export const createTransaction = async (data, userId) => {
    const transaction = await Transaction.create({ ...data, user: userId });
    return transaction;
};

export const getTransactions = async (queryParams, user) => {
    const { type, category, startDate, endDate, sort, page = 1, limit = 10, search } = queryParams;
    let query = {};

    if (user.role !== 'admin') {
        query.user = user._id;
    }

    if (type) query.type = type;
    if (category) query.category = category;

    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
    }

    // Text search execution globally
    if (search) {
        query.$or = [
            { category: { $regex: search, $options: 'i' } },
            { notes: { $regex: search, $options: 'i' } }
        ];
    }

    let sortOption = {};
    if (sort === 'date') sortOption.date = -1;
    else if (sort === 'amount') sortOption.amount = -1;
    else sortOption.createdAt = -1;

    // Pagination computational mapping
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const total = await Transaction.countDocuments(query);

    const transactions = await Transaction.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNumber)
        .populate('user', 'name email');

    return {
        data: transactions,
        pagination: {
            total,
            page: pageNumber,
            pages: Math.ceil(total / limitNumber),
            limit: limitNumber
        }
    };
};

export const getTransactionById = async (id, user) => {
    const transaction = await Transaction.findById(id).populate('user', 'name email');
    if (!transaction) throw new AppError('Transaction not found', 404);

    if (user.role !== 'admin' && transaction.user._id.toString() !== user._id.toString()) {
        throw new AppError('Not authorized to access this transaction', 403);
    }
    return transaction;
};

export const updateTransaction = async (id, data, user) => {
    await getTransactionById(id, user);
    const updatedTransaction = await Transaction.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
    ).populate('user', 'name email');

    return updatedTransaction;
};

export const deleteTransaction = async (id, user) => {
    const transaction = await getTransactionById(id, user);
    await transaction.deleteOne();
    return { message: 'Transaction removed successfully' };
};
