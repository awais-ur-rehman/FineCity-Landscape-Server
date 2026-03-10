import mongoose from 'mongoose';
import env from './env.js';
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;
/**
 * Connect to MongoDB Atlas with retry logic.
 */
const connectDB = async () => {
    let retries = 0;
    while (retries < MAX_RETRIES) {
        try {
            await mongoose.connect(env.MONGODB_URI, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            console.log('MongoDB connected successfully');
            return;
        }
        catch (error) {
            retries += 1;
            console.error(`MongoDB connection attempt ${retries}/${MAX_RETRIES} failed:`, error.message);
            if (retries >= MAX_RETRIES) {
                console.error('Max retries reached. Exiting.');
                process.exit(1);
            }
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }
};
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});
mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err);
});
export default connectDB;
