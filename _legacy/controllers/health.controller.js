/**
 * Health Check Controller
 * Simple return of OK status to ensure the API is running
 */
export const checkHealth = (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString()
    });
};
