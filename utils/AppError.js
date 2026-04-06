class AppError extends Error {
    constructor(message, statusCode) {
        super(message);

        this.statusCode = statusCode;
        // Determine status prefix based on code block
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

        // Mark as an operational error rather than an unexpected system failure
        this.isOperational = true;

        // Omit constructor from the stacktrace logically
        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;
