import AppError from '../utils/AppError.js';

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
    const value = Object.values(err.keyValue)[0];
    const message = `Duplicate field value: '${value}'. Please use another value!`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);
const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', 401);

/**
 * Global Error Handling Middleware
 * Catch all unhandled errors sent through next(err)
 */
export const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    let error = Object.assign(err);

    // Mongoose Operational Issues
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);

    // JWT Context
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    // Backward compatibility with raw throw new Error wrappers resolving them into API specific AppErrors
    if (!error.isOperational) {
        if (error.message === 'User already exists') error = new AppError(error.message, 400);
        if (error.message.includes('Invalid email or password') || error.message.includes('deactivated')) error = new AppError(error.message, 401);
        if (error.message.includes('User not found with this token') || error.message.includes('Not authorized')) error = new AppError(error.message, 401);
        if (error.message === 'Transaction not found') error = new AppError(error.message, 404);
        if (error.message === 'Not authorized to access this transaction' || error.message.includes('not authorized to access')) error = new AppError(error.message, 403);
    }

    // Final JSON format push
    res.status(error.statusCode).json({
        success: false,
        status: error.status,
        message: error.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
