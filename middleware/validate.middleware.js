import { ZodError } from 'zod';
import AppError from '../utils/AppError.js';

/**
 * Higher Order function validating req arrays against the passed Zod schema seamlessly
 */
export const validate = (schema) => (req, res, next) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            // Map zod errors into a readable string correctly stripping out validation context trees
            const errorMessages = error.errors.map((err) => `${err.path.join('.').replace('body.', '').replace('query.', '')}: ${err.message}`).join(', ');
            return next(new AppError(`Validation Error: ${errorMessages}`, 400));
        }
        next(error);
    }
};
