import Transaction from '../models/transaction.model.js';

export const createTransaction = async (data, userId) => {
    if (!data.amount || !data.type || !data.category) {
        throw new Error('Please provide amount, type, and category');
    }

    const transaction = await Transaction.create({ ...data, user: userId });
    return transaction;
};

export const getTransactions = async (queryParams, user) => {
    const { type, category, startDate, endDate, sort } = queryParams;
    let query = {};

    // Ownership logic: Admin sees all, others see only theirs
    if (user.role !== 'admin') {
        query.user = user._id;
    }

    // Filtering
    if (type) {
        query.type = type;
    }
    if (category) {
        query.category = category;
    }
    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
    }

    // Sorting
    let sortOption = {};
    if (sort === 'date') {
        sortOption.date = -1; // Newest first
    } else if (sort === 'amount') {
        sortOption.amount = -1; // Highest amount first
    } else {
        sortOption.createdAt = -1; // Default
    }

    const transactions = await Transaction.find(query)
        .sort(sortOption)
        .populate('user', 'name email');

    return transactions;
};

export const getTransactionById = async (id, user) => {
    const transaction = await Transaction.findById(id).populate('user', 'name email');

    if (!transaction) {
        throw new Error('Transaction not found');
    }

    // Ownership Validation
    if (user.role !== 'admin' && transaction.user._id.toString() !== user._id.toString()) {
        throw new Error('Not authorized to access this transaction');
    }

    return transaction;
};

export const updateTransaction = async (id, data, user) => {
    // We use getTransactionById to leverage its ownership check and 404
    const transaction = await getTransactionById(id, user);

    // Admin bypass is already handled by route guards, but this adds extra safety
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
