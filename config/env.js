import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Centralized configuration object
 * This avoids calling process.env multiple times across the application
 */
export const config = {
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/financedb',
    env: process.env.NODE_ENV || 'development'
};
