import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        category: {
            type: String,
            required: [true, 'Please provide a category'],
            trim: true,
        },
        limit: {
            type: Number,
            required: [true, 'Please provide a spending limit'],
            min: [0, 'Limit must be a positive number'],
        },
        period: {
            type: String,
            enum: ['weekly', 'monthly', 'yearly'],
            default: 'monthly',
        },
        color: {
            type: String,
            default: '#10B981',
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate budget category per user
budgetSchema.index({ user: 1, category: 1 }, { unique: true });

export default mongoose.model('Budget', budgetSchema);
