import app from './app.js';
import { connectDB } from './config/db.js';
import { config } from './config/env.js';

// Initialize the database connection
connectDB();

// Start the server
const server = app.listen(config.port, () => {
    console.log(`Server running in ${config.env} mode on port ${config.port}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});
