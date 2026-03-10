import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import User from '../src/models/User.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@finecity.ae';

/**
 * Seed initial admin user.
 */
const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ email: ADMIN_EMAIL });

    if (existing) {
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
        console.log(`Updated ${ADMIN_EMAIL} to admin role`);
      } else {
        console.log(`Admin user ${ADMIN_EMAIL} already exists`);
      }
    } else {
      await User.create({
        email: ADMIN_EMAIL,
        name: 'Admin',
        role: 'admin',
        isActive: true,
      });
      console.log(`Admin user created: ${ADMIN_EMAIL}`);
    }
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Done');
  }
};

seedAdmin();
