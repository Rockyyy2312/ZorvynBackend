import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        amount: {
            type: Number,
            required: [true, 'Please provide an amount'],
            min: [0, 'Amount must be a positive number'],
        },
        type: {
            type: String,
            enum: ['income', 'expense'],
            required: [true, 'Please provide a transaction type'],
        },
        category: {
            type: String,
            required: [true, 'Please provide a category'],
            trim: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
        notes: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model('Transaction', transactionSchema);
