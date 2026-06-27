import mongoose from 'mongoose';
import { config } from './env.js';

/**
 * Establish connection to MongoDB using Mongoose
 */
export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.mongoUri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        // Exit process with failure code 1
        process.exit(1);
    }
};
