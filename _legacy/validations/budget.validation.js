import { z } from 'zod';

export const createBudgetSchema = z.object({
    body: z.object({
        category: z.string().min(1, 'Category is required'),
        limit: z.number().positive('Limit must be a positive number'),
        period: z.enum(['weekly', 'monthly', 'yearly']).optional(),
        color: z.string().optional()
    })
});

export const updateBudgetSchema = z.object({
    body: z.object({
        category: z.string().min(1, 'Category is required').optional(),
        limit: z.number().positive('Limit must be a positive number').optional(),
        period: z.enum(['weekly', 'monthly', 'yearly']).optional(),
        color: z.string().optional()
    })
});
