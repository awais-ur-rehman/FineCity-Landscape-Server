import dotenv from 'dotenv';
dotenv.config();
const required = [
    'MONGODB_URI',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
    console.error(`Missing required environment variables:\n  ${missing.join('\n  ')}`);
    process.exit(1);
}
const env = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM || '"Finecity Landscape" <noreply@finecitylandscape.com>',
    FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json',
    FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT,
    ADMIN_URL: process.env.ADMIN_URL || 'http://localhost:5173',
    TASK_GENERATOR_CRON: process.env.TASK_GENERATOR_CRON || '0 2 * * *', // daily at 02:00
    TASK_DUE_NOTIFIER_CRON: process.env.TASK_DUE_NOTIFIER_CRON || '*/5 * * * *', // every 5 min
    TASK_REMINDER_CRON: process.env.TASK_REMINDER_CRON || '*/5 * * * *', // every 5 min
    TASK_OVERDUE_CRON: process.env.TASK_OVERDUE_CRON || '0 3 * * *', // daily at 03:00
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@finecity.ae',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};
export default env;
