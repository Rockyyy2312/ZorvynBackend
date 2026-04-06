/**
 * Async Error Handler Wrapper
 * Ensures standard Try/Catch block removal keeping backend code extremely thin and readable
 */
export const catchAsync = fn => {
    return (req, res, next) => {
        // Execute function and automatically forward any rejections to global error handler Next middleware
        fn(req, res, next).catch(next);
    };
};
