import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Branch from '../src/models/Branch.js';
import Category from '../src/models/Category.js';
import Zone from '../src/models/Zone.js';
import PlantType from '../src/models/PlantType.js';
import PlantBatch from '../src/models/PlantBatch.js';
import User from '../src/models/User.js';
import CareSchedule from '../src/models/CareSchedule.js';
import CareTask from '../src/models/CareTask.js';
import { PLANT_CATEGORIES } from '../src/utils/constants.js';

dotenv.config();

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    // 1. Create Default Branch
    let branch = await Branch.findOne({ code: 'HQ' });
    if (!branch) {
      branch = await Branch.create({
        name: 'Headquarters',
        code: 'HQ',
        location: 'Main Office',
        contactPerson: 'Admin',
        contactEmail: 'admin@finecity.ae',
      });
      console.log('Created Default Branch: HQ');
    }

    // 2. Create Categories
    const categoryMap = new Map<string, mongoose.Types.ObjectId>();
    for (const catName of PLANT_CATEGORIES) {
      let cat = await Category.findOne({ slug: catName });
      if (!cat) {
        cat = await Category.create({
          name: catName.charAt(0).toUpperCase() + catName.slice(1),
          slug: catName,
        });
      }
      categoryMap.set(catName, cat._id as mongoose.Types.ObjectId);
    }
    console.log('Categories synced');

    // 3. Create Zones (A-Z) and PlantTypes from existing batches
    // We need to fetch all batches first, but they might fail validation if we try to find them with strict schema?
    // Mongoose find() usually works even if schema doesn't match, unless we save.
    // But we defined schema with required: true for refs.
    // So existing documents without these fields might be problematic if we try to save them.
    // We'll use updateMany or bulkWrite where possible, or careful iteration.

    // Let's iterate using raw collection or lean() to avoid validation errors during read.
    const batches = await PlantBatch.find({}).lean();
    console.log(`Found ${batches.length} batches to migrate`);

    const zoneMap = new Map<string, mongoose.Types.ObjectId>();
    const plantTypeMap = new Map<string, mongoose.Types.ObjectId>();

    for (const batch of batches) {
      // Zone
      // @ts-ignore
      const zoneName = batch.zone;
      if (zoneName && typeof zoneName === 'string') {
        if (!zoneMap.has(zoneName)) {
          let zone = await Zone.findOne({ code: zoneName, branchId: branch._id });
          if (!zone) {
            zone = await Zone.create({
              name: `Zone ${zoneName}`,
              code: zoneName,
              branchId: branch._id,
            });
          }
          zoneMap.set(zoneName, zone._id as mongoose.Types.ObjectId);
        }
      }

      // PlantType
      // @ts-ignore
      const typeName = batch.plantType;
      if (typeName && typeof typeName === 'string') {
        if (!plantTypeMap.has(typeName)) {
          let pType = await PlantType.findOne({ name: typeName });
          if (!pType) {
            pType = await PlantType.create({
              name: typeName,
              // @ts-ignore
              scientificName: batch.scientificName,
            });
          }
          plantTypeMap.set(typeName, pType._id as mongoose.Types.ObjectId);
        }
      }
    }

    // 4. Update Users
    await User.updateMany(
      { branches: { $exists: false } },
      { $set: { branches: [branch._id], currentBranch: branch._id } }
    );
    console.log('Users updated');

    // 5. Update PlantBatches
    for (const batch of batches) {
      // @ts-ignore
      const zId = zoneMap.get(batch.zone);
      // @ts-ignore
      const cId = categoryMap.get(batch.category);
      // @ts-ignore
      const tId = plantTypeMap.get(batch.plantType);

      if (zId && cId && tId) {
        await PlantBatch.updateOne(
          { _id: batch._id },
          {
            $set: {
              branchId: branch._id,
              zone: zId,
              category: cId,
              plantType: tId,
            },
          }
        );
      }
    }
    console.log('PlantBatches updated');

    // 6. Update CareSchedules
    await CareSchedule.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId: branch._id } }
    );
    console.log('CareSchedules updated');

    // 7. Update CareTasks
    await CareTask.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId: branch._id } }
    );
    console.log('CareTasks updated');

  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Done');
  }
};

migrate();
