import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import env from './config/env.js';
import connectDB from './config/db.js';
import initFirebase from './config/firebase.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import plantBatchRoutes from './routes/plantBatch.routes.js';

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: env.ADMIN_URL,
  credentials: true,
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting
app.use('/api/', generalLimiter);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'Finecity Landscape API is running' });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/plant-batches', plantBatchRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    error: { code: 'NOT_FOUND' },
  });
});

// Global error handler
app.use(errorHandler);

/**
 * Start server and connect to services.
 */
const start = async () => {
  await connectDB();
  initFirebase();

  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });
};

// Only start if not in test mode (supertest handles its own server)
if (env.NODE_ENV !== 'test') {
  start();
}

export default app;
