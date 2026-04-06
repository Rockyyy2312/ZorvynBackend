import { z } from 'zod';

export const createTransactionSchema = z.object({
    body: z.object({
        amount: z.number().positive('Amount must be positive'),
        type: z.enum(['income', 'expense']),
        category: z.string().min(1, 'Category is required'),
        date: z.string().datetime().optional(),
        notes: z.string().optional()
    })
});

export const getTransactionsQuerySchema = z.object({
    query: z.object({
        type: z.enum(['income', 'expense']).optional(),
        category: z.string().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        sort: z.enum(['date', 'amount']).optional(),
        page: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional(),
        search: z.string().optional()
    })
});
