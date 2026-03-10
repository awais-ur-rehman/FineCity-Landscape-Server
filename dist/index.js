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
import careScheduleRoutes from './routes/careSchedule.routes.js';
import careTaskRoutes from './routes/careTask.routes.js';
import syncRoutes from './routes/sync.routes.js';
import branchRoutes from './routes/branch.routes.js';
import zoneRoutes from './routes/zone.routes.js';
import categoryRoutes from './routes/category.routes.js';
import plantTypeRoutes from './routes/plantType.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import startTaskGeneratorCron from './jobs/taskGeneratorCron.js';
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
app.use('/api/v1/care-schedules', careScheduleRoutes);
app.use('/api/v1/care-tasks', careTaskRoutes);
app.use('/api/v1/sync', syncRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/zones', zoneRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/plant-types', plantTypeRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
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
    startTaskGeneratorCron();
    app.listen(env.PORT, () => {
        console.log(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
};
// Only start if not in test mode (supertest handles its own server)
if (env.NODE_ENV !== 'test') {
    start();
}
export default app;
