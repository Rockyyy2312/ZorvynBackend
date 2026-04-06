import express from 'express';
import routes from './routes/index.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount Routes
app.use('/api', routes);

// Error Handling Middlewares
// 1. Not Found route handler
app.use(notFoundHandler);

// 2. Global Error Handler
app.use(errorHandler);

export default app;
