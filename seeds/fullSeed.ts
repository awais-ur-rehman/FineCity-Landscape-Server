import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import User from '../src/models/User.js';
import Branch from '../src/models/Branch.js';
import Zone from '../src/models/Zone.js';
import Category from '../src/models/Category.js';
import PlantType from '../src/models/PlantType.js';
import PlantBatch from '../src/models/PlantBatch.js';
import CareType from '../src/models/CareType.js';
import CareSchedule from '../src/models/CareSchedule.js';
import CareTask from '../src/models/CareTask.js';
import AuditLog from '../src/models/AuditLog.js';

const SUPER_ADMIN_EMAIL = 'awaisjarral37@gmail.com';
const ADMIN_EMAIL = 'awais@bridgeframe.co';

const seed = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Clear Database
    console.log('Clearing database...');
    await Promise.all([
      User.deleteMany({}),
      Branch.deleteMany({}),
      Zone.deleteMany({}),
      Category.deleteMany({}),
      PlantType.deleteMany({}),
      PlantBatch.deleteMany({}),
      CareType.deleteMany({}),
      CareSchedule.deleteMany({}),
      CareTask.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);
    console.log('Database cleared.');

    // 2. Create Users
    console.log('Creating users...');
    const superAdmin = await User.create({
      name: 'Awais Jarral',
      email: SUPER_ADMIN_EMAIL,
      role: 'super_admin',
      phone: '+971500000001',
      isActive: true,
    });

    const admin = await User.create({
      name: 'Awais Admin',
      email: ADMIN_EMAIL,
      role: 'admin',
      phone: '+971500000002',
      isActive: true,
    });
    console.log('Users created.');

    // 3. Create Branches
    console.log('Creating branches...');
    const branches = await Branch.insertMany([
      {
        name: 'Main Nursery',
        code: 'MN-01',
        location: 'Al Warsan, Dubai',
        contactPerson: 'Manager One',
        contactPhone: '+971 4 123 4567',
        contactEmail: 'main@finecity.ae',
        isActive: true,
      },
      {
        name: 'Downtown Showroom',
        code: 'DT-01',
        location: 'Downtown Dubai',
        contactPerson: 'Manager Two',
        contactPhone: '+971 4 987 6543',
        contactEmail: 'downtown@finecity.ae',
        isActive: true,
      },
    ]);
    const mainBranch = branches[0];
    const downtownBranch = branches[1];
    console.log('Branches created.');

    // Update users with branches
    await User.findByIdAndUpdate(superAdmin._id, {
      branches: [mainBranch._id, downtownBranch._id],
      currentBranch: mainBranch._id,
    });
    await User.findByIdAndUpdate(admin._id, {
      branches: [mainBranch._id],
      currentBranch: mainBranch._id,
    });
    console.log('Users updated with branches.');

    // 4. Create Zones (Linked to Branches)
    console.log('Creating zones...');
    const zones = await Zone.insertMany([
      { name: 'Zone A - Greenhouse', code: 'Z-A', branchId: mainBranch._id },
      { name: 'Zone B - Shade Area', code: 'Z-B', branchId: mainBranch._id },
      { name: 'Zone C - Outdoor Sun', code: 'Z-C', branchId: mainBranch._id },
      { name: 'Showroom Floor', code: 'SR-1', branchId: downtownBranch._id },
    ]);
    const zoneA = zones[0];
    const zoneB = zones[1];
    console.log('Zones created.');

    // 5. Create Categories
    console.log('Creating categories...');
    const categories = await Category.insertMany([
      { name: 'Indoor Plants', slug: 'indoor', description: 'Plants suitable for indoor environments' },
      { name: 'Outdoor Plants', slug: 'outdoor', description: 'Plants that thrive in direct sunlight' },
      { name: 'Succulents & Cacti', slug: 'succulents', description: 'Drought tolerant plants' },
      { name: 'Trees & Palms', slug: 'trees', description: 'Large woody plants' },
    ]);
    const indoor = categories[0];
    const outdoor = categories[1];
    console.log('Categories created.');

    // 6. Create Plant Types
    console.log('Creating plant types...');
    const plantTypes = await PlantType.insertMany([
      {
        name: 'Areca Palm',
        scientificName: 'Dypsis lutescens',
        description: 'Popular indoor palm',
        careInstructions: 'Water moderate, Light bright indirect',
      },
      {
        name: 'Snake Plant',
        scientificName: 'Sansevieria trifasciata',
        description: 'Hardy indoor plant',
        careInstructions: 'Water low, Light low to bright',
      },
      {
        name: 'Bougainvillea',
        scientificName: 'Bougainvillea glabra',
        description: 'Colorful climbing plant',
        careInstructions: 'Water moderate, Light direct sun',
      },
    ]);
    const arecaPalm = plantTypes[0];
    const snakePlant = plantTypes[1];
    console.log('Plant types created.');

    // 7. Create Care Types
    console.log('Creating care types...');
    const careTypes = await CareType.insertMany([
      { name: 'Watering', slug: 'watering', color: '#3B82F6', icon: 'droplet' },
      { name: 'Fertilizing', slug: 'fertilizing', color: '#F59E0B', icon: 'sprout' },
      { name: 'Pruning', slug: 'pruning', color: '#8B5CF6', icon: 'scissors' },
      { name: 'Pest Control', slug: 'pest_control', color: '#EF4444', icon: 'bug' },
    ]);
    console.log('Care types created.');

    // 8. Create Plant Batches
    console.log('Creating plant batches...');
    await PlantBatch.insertMany([
      {
        name: 'Areca Palm Batch 1',
        plantType: arecaPalm._id,
        scientificName: arecaPalm.scientificName,
        category: indoor._id,
        quantity: 50,
        zone: zoneA._id,
        location: 'Row 1',
        status: 'active',
        branchId: mainBranch._id,
        createdBy: admin._id,
      },
      {
        name: 'Snake Plant Propagation',
        plantType: snakePlant._id,
        scientificName: snakePlant.scientificName,
        category: indoor._id,
        quantity: 100,
        zone: zoneB._id,
        location: 'Bench 3',
        status: 'active',
        branchId: mainBranch._id,
        createdBy: admin._id,
      },
    ]);

    console.log('Plant batches created.');
    console.log('Seeding completed successfully!');
    
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed.');
  }
};

seed();
