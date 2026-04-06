import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

// Set security HTTP headers natively via Helmet bindings
app.use(helmet());

// Apply dynamic global Rate Limiting ensuring minimal server DDoSing capabilities - 1000 Requests every hour maximum
const limiter = rateLimit({
    max: 1000,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests generated from this IP targeting the server API, please try again in an hour!'
});
app.use('/api', limiter);

// Body Parser Middleware resolving basic payload reading
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount Unified Routing Base
app.use('/api', routes);

// Custom Final Error Catching Boundaries
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
