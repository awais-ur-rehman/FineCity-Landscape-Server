/**
 * Full seed — clears all data then populates:
 *   2 super_admins · 2 branch_managers · 5 employees
 *   2 branches · 5 zones · 5 categories · 7 plant types
 *   4 fertilizers · 7 plant batches · 12 care schedules
 *   ~200 care tasks (rich 30-day history for analytics + leaderboard)
 *
 * Run: npx tsx seeds/fullSeed.ts
 * All accounts use password: Finecity@123
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

import User from '../src/models/User.js';
import Branch from '../src/models/Branch.js';
import Zone from '../src/models/Zone.js';
import Category from '../src/models/Category.js';
import PlantType from '../src/models/PlantType.js';
import PlantBatch from '../src/models/PlantBatch.js';
import Fertilizer from '../src/models/Fertilizer.js';
import CareSchedule from '../src/models/CareSchedule.js';
import CareTask from '../src/models/CareTask.js';
import AuditLog from '../src/models/AuditLog.js';
import FertilizerUsage from '../src/models/FertilizerUsage.js';

// ─── Credentials ─────────────────────────────────────────────────────────────
const PASSWORD = 'Finecity@123';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const daysAgo  = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysFrom = (n: number) => new Date(Date.now() + n * 86_400_000);
const todayAt  = (hh: number, mm = 0) => { const d = new Date(); d.setHours(hh, mm, 0, 0); return d; };

// ─── Main ─────────────────────────────────────────────────────────────────────
const seed = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set in .env');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB');

  // ── 1. Clear ──────────────────────────────────────────────────────────────
  console.log('  Clearing collections…');
  await Promise.all([
    User.deleteMany({}),
    Branch.deleteMany({}),
    Zone.deleteMany({}),
    Category.deleteMany({}),
    PlantType.deleteMany({}),
    PlantBatch.deleteMany({}),
    Fertilizer.deleteMany({}),
    CareSchedule.deleteMany({}),
    CareTask.deleteMany({}),
    AuditLog.deleteMany({}),
    FertilizerUsage.deleteMany({}),
  ]);
  console.log('✓ Collections cleared');

  const hash = await bcrypt.hash(PASSWORD, 12);

  // ── 2. Branches ───────────────────────────────────────────────────────────
  console.log('  Creating branches…');
  const [mainBranch, downtownBranch] = await Branch.insertMany([
    {
      name: 'Main Nursery',
      code: 'MN-01',
      location: 'Al Warsan, Dubai',
      address: 'Warehouse District, Al Warsan 3, Dubai, UAE',
      contactPerson: 'Irooh Bangash',
      contactPhone: '+971 4 123 4567',
      contactEmail: 'main@finecity.ae',
      isActive: true,
    },
    {
      name: 'Downtown Showroom',
      code: 'DT-01',
      location: 'Downtown Dubai',
      address: 'Sheikh Mohammed Bin Rashid Blvd, Downtown Dubai, UAE',
      contactPerson: 'Omar Al Farooq',
      contactPhone: '+971 4 987 6543',
      contactEmail: 'downtown@finecity.ae',
      isActive: true,
    },
  ]);
  console.log('✓ Branches created');

  // ── 3. Users ──────────────────────────────────────────────────────────────
  console.log('  Creating users…');

  // Super Admins
  await User.create({
    email: 'iroohbangash@gmail.com',
    name: 'Irooh Bangash',
    phone: '+971501234000',
    role: 'super_admin',
    passwordHash: hash,
    isActive: true,
    branches: [mainBranch._id, downtownBranch._id],
    currentBranch: mainBranch._id,
  });

  await User.create({
    email: 'awaisjarral37@gmail.com',
    name: 'Awais Jarral',
    phone: '+971501234001',
    role: 'super_admin',
    passwordHash: hash,
    isActive: true,
    branches: [mainBranch._id, downtownBranch._id],
    currentBranch: mainBranch._id,
  });

  // Branch Managers
  const admin1 = await User.create({
    email: 'asadhanzlah@gmail.com',
    name: 'Asad Hanzlah',
    phone: '+971501234002',
    role: 'branch_manager',
    passwordHash: hash,
    isActive: true,
    branches: [mainBranch._id],
    currentBranch: mainBranch._id,
  });

  const admin2 = await User.create({
    email: 'omar.admin@finecity.ae',
    name: 'Omar Al Farooq',
    phone: '+971501234003',
    role: 'branch_manager',
    passwordHash: hash,
    isActive: true,
    branches: [downtownBranch._id],
    currentBranch: downtownBranch._id,
  });

  // Main Nursery employees — varied performance profiles
  const emp1 = await User.create({
    email: 'ali.hassan@finecity.ae',
    name: 'Ali Hassan',
    phone: '+971501234004',
    role: 'employee',
    passwordHash: hash,
    isActive: true,
    branches: [mainBranch._id],
    currentBranch: mainBranch._id,
  });

  const emp2 = await User.create({
    email: 'sara.ahmed@finecity.ae',
    name: 'Sara Ahmed',
    phone: '+971501234005',
    role: 'employee',
    passwordHash: hash,
    isActive: true,
    branches: [mainBranch._id],
    currentBranch: mainBranch._id,
  });

  const emp4 = await User.create({
    email: 'faisal.malik@finecity.ae',
    name: 'Faisal Malik',
    phone: '+971501234007',
    role: 'employee',
    passwordHash: hash,
    isActive: true,
    branches: [mainBranch._id],
    currentBranch: mainBranch._id,
  });

  const emp5 = await User.create({
    email: 'nadia.rahman@finecity.ae',
    name: 'Nadia Rahman',
    phone: '+971501234008',
    role: 'employee',
    passwordHash: hash,
    isActive: true,
    branches: [mainBranch._id],
    currentBranch: mainBranch._id,
  });

  // Downtown employee
  const emp3 = await User.create({
    email: 'khalid.nasser@finecity.ae',
    name: 'Khalid Nasser',
    phone: '+971501234006',
    role: 'employee',
    passwordHash: hash,
    isActive: true,
    branches: [downtownBranch._id],
    currentBranch: downtownBranch._id,
  });

  console.log('✓ Users created');

  // ── 4. Zones ──────────────────────────────────────────────────────────────
  console.log('  Creating zones…');
  const [zoneA, zoneB, zoneC, zoneSR, zoneRT] = await Zone.insertMany([
    { name: 'Zone A — Greenhouse',  code: 'Z-A',  branchId: mainBranch._id,     isActive: true },
    { name: 'Zone B — Shade Area',  code: 'Z-B',  branchId: mainBranch._id,     isActive: true },
    { name: 'Zone C — Outdoor Sun', code: 'Z-C',  branchId: mainBranch._id,     isActive: true },
    { name: 'Showroom Floor',       code: 'SR-1', branchId: downtownBranch._id, isActive: true },
    { name: 'Rooftop Garden',       code: 'RT-1', branchId: downtownBranch._id, isActive: true },
  ]);
  console.log('✓ Zones created');

  // ── 5. Categories ─────────────────────────────────────────────────────────
  console.log('  Creating categories…');
  const [catIndoor, catOutdoor, catSucculent, catPalm] = await Category.insertMany([
    { name: 'Indoor Plants',      slug: 'indoor',    description: 'Suited to indoor low-light environments' },
    { name: 'Outdoor Plants',     slug: 'outdoor',   description: 'Thrive in direct sunlight and open air'  },
    { name: 'Succulents & Cacti', slug: 'succulent', description: 'Drought-tolerant desert plants'          },
    { name: 'Trees & Palms',      slug: 'palm',      description: 'Large woody palms and shade trees'        },
    { name: 'Herbs & Edibles',    slug: 'herb',      description: 'Aromatic and edible garden plants'        },
  ]);
  console.log('✓ Categories created');

  // ── 6. Plant Types ────────────────────────────────────────────────────────
  console.log('  Creating plant types…');
  const [ptAreca, ptSnake, ptMonstera, ptBougain, , ptAloe] =
    await PlantType.insertMany([
      { name: 'Areca Palm',       scientificName: 'Dypsis lutescens',          careInstructions: 'Bright indirect light. Water when top 2 cm dry.' },
      { name: 'Snake Plant',      scientificName: 'Sansevieria trifasciata',   careInstructions: 'Low light tolerant. Water every 2–6 weeks.'       },
      { name: 'Monstera',         scientificName: 'Monstera deliciosa',        careInstructions: 'Bright indirect light. Water every 1–2 weeks.'    },
      { name: 'Bougainvillea',    scientificName: 'Bougainvillea glabra',      careInstructions: 'Full sun. Drought tolerant once established.'      },
      { name: 'Date Palm',        scientificName: 'Phoenix dactylifera',       careInstructions: 'Full sun. Deep watering every 1–2 weeks.'          },
      { name: 'Aloe Vera',        scientificName: 'Aloe barbadensis miller',   careInstructions: 'Bright indirect light. Water every 2–3 weeks.'     },
      { name: 'Arabian Jasmine',  scientificName: 'Jasminum sambac',           careInstructions: 'Partial to full sun. Water regularly.'             },
    ]);
  console.log('✓ Plant types created');

  // ── 7. Fertilizers ────────────────────────────────────────────────────────
  console.log('  Creating fertilizers…');
  const [fertGreenGrow, fertBloomBoost, , fertShowGrow] =
    await Fertilizer.insertMany([
      { name: 'GreenGrow All-Purpose', brand: 'GreenGrow', type: 'organic',   npkRatio: '5-5-5',  description: 'Balanced organic feed.', defaultDosage: 50, defaultUnit: 'ml', isActive: true, branchId: mainBranch._id,     createdBy: admin1._id },
      { name: 'BloomBoost Flowering',  brand: 'BloomBoost', type: 'chemical', npkRatio: '5-10-5', description: 'High-P flowering formula.', defaultDosage: 30, defaultUnit: 'ml', isActive: true, branchId: mainBranch._id,     createdBy: admin1._id },
      { name: 'RootMax Stimulator',    brand: 'RootMax',   type: 'bio',       npkRatio: '3-15-3', description: 'Mycorrhizae root stimulant.', defaultDosage: 20, defaultUnit: 'ml', isActive: true, branchId: mainBranch._id,   createdBy: admin1._id },
      { name: 'ShowGrow Premium',      brand: 'ShowGrow',  type: 'organic',   npkRatio: '8-4-4',  description: 'Slow-release pellets for showroom.', defaultDosage: 10, defaultUnit: 'g', isActive: true, branchId: downtownBranch._id, createdBy: admin2._id },
    ]);
  console.log('✓ Fertilizers created');

  // ── 8. Plant Batches ──────────────────────────────────────────────────────
  console.log('  Creating plant batches…');
  const [
    batchAreca, batchSnake, batchMonstera, batchBougain, batchAloe,
    batchShowMonstera, batchDowntownPalm,
  ] = await PlantBatch.insertMany([
    { name: 'Areca Palm — Batch A',         plantType: ptAreca._id,   scientificName: 'Dypsis lutescens',        category: catPalm._id,      quantity: 50,  zone: zoneA._id,  location: 'Row 1, Greenhouse',          status: 'active', branchId: mainBranch._id,     createdBy: admin1._id },
    { name: 'Snake Plant Collection',       plantType: ptSnake._id,   scientificName: 'Sansevieria trifasciata', category: catIndoor._id,    quantity: 120, zone: zoneB._id,  location: 'Bench 3–5, Shade Area',      status: 'active', branchId: mainBranch._id,     createdBy: admin1._id },
    { name: 'Monstera Display Stock',       plantType: ptMonstera._id,scientificName: 'Monstera deliciosa',      category: catIndoor._id,    quantity: 35,  zone: zoneA._id,  location: 'Centre Aisle, Greenhouse',   status: 'active', branchId: mainBranch._id,     createdBy: admin1._id },
    { name: 'Bougainvillea Row 1',          plantType: ptBougain._id, scientificName: 'Bougainvillea glabra',    category: catOutdoor._id,   quantity: 40,  zone: zoneC._id,  location: 'South Fence Line',           status: 'active', branchId: mainBranch._id,     createdBy: admin1._id },
    { name: 'Aloe Vera Propagation',        plantType: ptAloe._id,    scientificName: 'Aloe barbadensis miller', category: catSucculent._id, quantity: 200, zone: zoneB._id,  location: 'Tray Rack B2',               status: 'active', branchId: mainBranch._id,     createdBy: admin1._id },
    { name: 'Showroom Monstera Feature',    plantType: ptMonstera._id,scientificName: 'Monstera deliciosa',      category: catIndoor._id,    quantity: 15,  zone: zoneSR._id, location: 'Feature Wall, Ground Floor', status: 'active', branchId: downtownBranch._id, createdBy: admin2._id },
    { name: 'Premium Areca Palms — DT',     plantType: ptAreca._id,   scientificName: 'Dypsis lutescens',        category: catPalm._id,      quantity: 20,  zone: zoneRT._id, location: 'Rooftop Perimeter',          status: 'active', branchId: downtownBranch._id, createdBy: admin2._id },
  ]);
  console.log('✓ Plant batches created');

  // ── 9. Care Schedules ────────────────────────────────────────────────────
  console.log('  Creating care schedules…');
  const scheduleStart = daysAgo(30);

  const schedules = await CareSchedule.insertMany([
    // Areca Palm — Main (emp1 + emp2)
    { batchId: batchAreca._id, branchId: mainBranch._id, careType: 'watering',    frequencyDays: 3,  scheduledTime: '08:00', assignedTo: [emp1._id, emp2._id],        instructions: 'Water thoroughly until drainage.',                            startDate: scheduleStart, isActive: true, createdBy: admin1._id },
    { batchId: batchAreca._id, branchId: mainBranch._id, careType: 'fertilizing', frequencyDays: 14, scheduledTime: '09:00', assignedTo: [emp1._id],                  instructions: 'GreenGrow 50ml per 5L water.',        recommendedFertilizers: [fertGreenGrow._id], startDate: scheduleStart, isActive: true, createdBy: admin1._id },
    // Snake Plant — Main (emp2)
    { batchId: batchSnake._id, branchId: mainBranch._id, careType: 'watering',    frequencyDays: 7,  scheduledTime: '08:00', assignedTo: [emp2._id],                  instructions: 'Water only when top 3 cm is completely dry.',                 startDate: scheduleStart, isActive: true, createdBy: admin1._id },
    { batchId: batchSnake._id, branchId: mainBranch._id, careType: 'pruning',     frequencyDays: 21, scheduledTime: '10:00', assignedTo: [emp1._id, emp2._id],        instructions: 'Remove yellowed or damaged leaves.',                          startDate: scheduleStart, isActive: true, createdBy: admin1._id },
    // Monstera — Main (emp1 + emp4)
    { batchId: batchMonstera._id, branchId: mainBranch._id, careType: 'watering', frequencyDays: 4,  scheduledTime: '08:00', assignedTo: [emp1._id, emp4._id],        instructions: 'Water until drainage, let top 2cm dry before next.',         startDate: scheduleStart, isActive: true, createdBy: admin1._id },
    { batchId: batchMonstera._id, branchId: mainBranch._id, careType: 'fertilizing', frequencyDays: 21, scheduledTime: '09:00', assignedTo: [emp4._id],              instructions: 'BloomBoost 30ml per 5L.',             recommendedFertilizers: [fertBloomBoost._id], startDate: scheduleStart, isActive: true, createdBy: admin1._id },
    // Bougainvillea — Main (emp2 + emp5)
    { batchId: batchBougain._id, branchId: mainBranch._id, careType: 'watering',  frequencyDays: 2,  scheduledTime: '07:00', assignedTo: [emp2._id, emp5._id],        instructions: 'Deep water at base only. Avoid wetting foliage.',             startDate: scheduleStart, isActive: true, createdBy: admin1._id },
    { batchId: batchBougain._id, branchId: mainBranch._id, careType: 'pruning',   frequencyDays: 21, scheduledTime: '10:00', assignedTo: [emp4._id, emp5._id],        instructions: 'Hard prune after flowering. Wear gloves.',                    startDate: scheduleStart, isActive: true, createdBy: admin1._id },
    // Aloe Vera — Main (emp5)
    { batchId: batchAloe._id, branchId: mainBranch._id, careType: 'watering',     frequencyDays: 10, scheduledTime: '08:00', assignedTo: [emp5._id],                  instructions: 'Soak and dry method. Wait until bone dry.',                   startDate: scheduleStart, isActive: true, createdBy: admin1._id },
    // Downtown — emp3
    { batchId: batchShowMonstera._id, branchId: downtownBranch._id, careType: 'watering',    frequencyDays: 5,  scheduledTime: '09:00', assignedTo: [emp3._id], instructions: 'Use drip tray. Avoid spilling on showroom floor.',             startDate: scheduleStart, isActive: true, createdBy: admin2._id },
    { batchId: batchDowntownPalm._id, branchId: downtownBranch._id, careType: 'watering',    frequencyDays: 3,  scheduledTime: '08:30', assignedTo: [emp3._id], instructions: 'Water rooftop plants early morning before peak heat.',         startDate: scheduleStart, isActive: true, createdBy: admin2._id },
    { batchId: batchDowntownPalm._id, branchId: downtownBranch._id, careType: 'fertilizing', frequencyDays: 14, scheduledTime: '09:00', assignedTo: [emp3._id], instructions: 'ShowGrow Premium 10g per pot.', recommendedFertilizers: [fertShowGrow._id], startDate: scheduleStart, isActive: true, createdBy: admin2._id },
  ]);

  const [
    schArecaWater, schArecaFert,
    schSnakeWater, schSnakePrune,
    schMonsteraWater, schMonsteraFert,
    schBougainWater, schBougainPrune,
    schAloeWater,
    schShowMonsteraWater,
    schDtPalmWater, schDtPalmFert,
  ] = schedules;
  console.log('✓ Care schedules created');

  // ── 10. Care Tasks ────────────────────────────────────────────────────────
  // Employee performance profiles (probability of completing each task):
  //   Ali Hassan  (emp1) — star performer:  95% completion
  //   Sara Ahmed  (emp2) — good:            80% completion
  //   Faisal Malik(emp4) — average:         65% completion
  //   Nadia Rahman(emp5) — improving:       55% completion
  //   Khalid Nasser(emp3)— downtown:        75% completion
  console.log('  Creating care tasks…');

  type TaskInsert = {
    scheduleId: mongoose.Types.ObjectId;
    batchId: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    careType: string;
    scheduledAt: Date;
    status: 'pending' | 'completed' | 'missed' | 'skipped';
    assignedTo: mongoose.Types.ObjectId[];
    completedBy?: mongoose.Types.ObjectId;
    completedAt?: Date;
    notes?: string;
    notificationSent: boolean;
    reminderSent: boolean;
  };

  const tasks: TaskInsert[] = [];

  /**
   * completionChance: 0–1. Tasks completed by primaryCompleter.
   * missChance: of the non-completed, some are missed (older), some still pending (recent).
   */
  const addTasksRich = (
    schedule: (typeof schedules)[0],
    batchId: mongoose.Types.ObjectId,
    branchId: mongoose.Types.ObjectId,
    careType: string,
    freq: number,
    assignedTo: mongoose.Types.ObjectId[],
    primaryCompleter: mongoose.Types.ObjectId,
    completionChance: number,   // 0–1
    noteVariants: string[],
  ) => {
    let index = 0;
    for (let offset = 30; offset >= 1; offset -= freq) {
      const scheduledAt = daysAgo(offset);
      scheduledAt.setHours(8, 0, 0, 0);

      const completed = Math.random() < completionChance;

      if (completed) {
        tasks.push({
          scheduleId: schedule._id as mongoose.Types.ObjectId,
          batchId, branchId, careType, scheduledAt,
          status: 'completed',
          assignedTo,
          completedBy: primaryCompleter,
          completedAt: new Date(scheduledAt.getTime() + (30 + Math.floor(Math.random() * 90)) * 60_000),
          notes: noteVariants[index % noteVariants.length],
          notificationSent: true,
          reminderSent: true,
        });
      } else {
        // Not completed — older tasks become missed, very recent are still pending
        const isMissed = offset > 1;
        tasks.push({
          scheduleId: schedule._id as mongoose.Types.ObjectId,
          batchId, branchId, careType, scheduledAt,
          status: isMissed ? 'missed' : 'pending',
          assignedTo,
          notificationSent: true,
          reminderSent: isMissed,
        });
      }
      index++;
    }

    // Today — pending (or overdue if hour already passed)
    const todayScheduled = todayAt(8);
    const isOverdue = new Date() > todayScheduled;
    tasks.push({
      scheduleId: schedule._id as mongoose.Types.ObjectId,
      batchId, branchId, careType,
      scheduledAt: todayScheduled,
      status: 'pending',
      assignedTo,
      notificationSent: true,
      reminderSent: isOverdue,
    });

    // Tomorrow — pending
    const tomorrow = daysFrom(1);
    tomorrow.setHours(8, 0, 0, 0);
    tasks.push({
      scheduleId: schedule._id as mongoose.Types.ObjectId,
      batchId, branchId, careType,
      scheduledAt: tomorrow,
      status: 'pending',
      assignedTo,
      notificationSent: false,
      reminderSent: false,
    });
  };

  // ── Main Nursery tasks ────────────────────────────────────────────────────

  // Ali Hassan — star performer (95%)
  addTasksRich(schArecaWater,    batchAreca._id,    mainBranch._id,  'watering',    3,  [emp1._id, emp2._id],  emp1._id, 0.95, ['Watered thoroughly.', 'Done — soil draining well.', 'Complete.']);
  addTasksRich(schArecaFert,     batchAreca._id,    mainBranch._id,  'fertilizing', 14, [emp1._id],            emp1._id, 0.95, ['GreenGrow applied.', 'Fertilizer done — leaves look healthy.']);
  addTasksRich(schMonsteraWater, batchMonstera._id, mainBranch._id,  'watering',    4,  [emp1._id, emp4._id],  emp1._id, 0.92, ['Watered until drainage.', 'Done.', 'All plants checked.']);

  // Sara Ahmed — good performer (80%)
  addTasksRich(schSnakeWater,    batchSnake._id,    mainBranch._id,  'watering',    7,  [emp2._id],            emp2._id, 0.80, ['Checked moisture — watered.', 'Soil was very dry — deep watered.', 'Done.']);
  addTasksRich(schSnakePrune,    batchSnake._id,    mainBranch._id,  'pruning',     21, [emp1._id, emp2._id],  emp2._id, 0.80, ['Removed 3 yellow leaves.', 'Minor pruning done.']);
  addTasksRich(schBougainWater,  batchBougain._id,  mainBranch._id,  'watering',    2,  [emp2._id, emp5._id],  emp2._id, 0.78, ['Base watered only.', 'Done — foliage dry.', 'Complete.']);

  // Faisal Malik — average (65%)
  addTasksRich(schMonsteraFert,  batchMonstera._id, mainBranch._id,  'fertilizing', 21, [emp4._id],            emp4._id, 0.65, ['BloomBoost applied.', 'Done.']);
  addTasksRich(schBougainPrune,  batchBougain._id,  mainBranch._id,  'pruning',     21, [emp4._id, emp5._id],  emp4._id, 0.65, ['Pruned lower branches.', 'Done — wore gloves.']);

  // Nadia Rahman — below average (55%)
  addTasksRich(schAloeWater,     batchAloe._id,     mainBranch._id,  'watering',    10, [emp5._id],            emp5._id, 0.55, ['Soil bone dry — deep watered.', 'Done.']);

  // ── Downtown tasks ────────────────────────────────────────────────────────
  // Khalid Nasser — decent (75%)
  addTasksRich(schShowMonsteraWater, batchShowMonstera._id, downtownBranch._id, 'watering',    5,  [emp3._id], emp3._id, 0.75, ['Careful watering — no spills.', 'Done.', 'Drip tray used.']);
  addTasksRich(schDtPalmWater,       batchDowntownPalm._id, downtownBranch._id, 'watering',    3,  [emp3._id], emp3._id, 0.75, ['Early morning watering done.', 'Complete.', 'Done.']);
  addTasksRich(schDtPalmFert,        batchDowntownPalm._id, downtownBranch._id, 'fertilizing', 14, [emp3._id], emp3._id, 0.75, ['ShowGrow applied evenly.', 'Done.']);

  const insertedTasks = await CareTask.insertMany(tasks, { ordered: false });
  console.log(`✓ Care tasks created (${insertedTasks.length} total)`);

  // ── 11. FertilizerUsage ──────────────────────────────────────────────────
  console.log('  Creating fertilizer usage records…');
  const completedFertilizingTasks = insertedTasks.filter(
    (t) => t.careType === 'fertilizing' && t.status === 'completed' && t.completedBy,
  );

  const fertUsageDocs = completedFertilizingTasks.map((task) => {
    let fertilizerId = fertGreenGrow._id;
    if (task.scheduleId.toString() === schMonsteraFert._id.toString())  fertilizerId = fertBloomBoost._id;
    if (task.scheduleId.toString() === schDtPalmFert._id.toString())    fertilizerId = fertShowGrow._id;
    return {
      taskId: task._id,
      scheduleId: task.scheduleId,
      batchId: task.batchId,
      branchId: task.branchId,
      completedBy: task.completedBy,
      recordedAt: task.completedAt ?? task.scheduledAt,
      usages: [{ fertilizerId, quantity: 50, unit: 'ml' as const }],
      notes: 'Applied per schedule instructions.',
    };
  });

  if (fertUsageDocs.length > 0) {
    await FertilizerUsage.insertMany(fertUsageDocs, { ordered: false });
  }
  console.log(`✓ Fertilizer usage created (${fertUsageDocs.length} total)`);

  // ── 12. Stats summary ────────────────────────────────────────────────────
  const total     = insertedTasks.length;
  const completed = insertedTasks.filter((t) => t.status === 'completed').length;
  const missed    = insertedTasks.filter((t) => t.status === 'missed').length;
  const pending   = insertedTasks.filter((t) => t.status === 'pending').length;

  console.log('\n════════════════════════════════════════════════════════');
  console.log('  SEED COMPLETE');
  console.log('────────────────────────────────────────────────────────');
  console.log(`  Tasks: ${total} total — ${completed} completed, ${missed} missed, ${pending} pending`);
  console.log(`  Completion rate: ${Math.round((completed / (total - pending)) * 100)}%`);
  console.log('────────────────────────────────────────────────────────');
  console.log('  SUPER ADMINS  (password: Finecity@123)');
  console.log('    iroohbangash@gmail.com  — Irooh Bangash');
  console.log('    awaisjarral37@gmail.com — Awais Jarral');
  console.log('  BRANCH MANAGERS');
  console.log('    asadhanzlah@gmail.com   — Asad Hanzlah   (Main Nursery)');
  console.log('    omar.admin@finecity.ae  — Omar Al Farooq (Downtown)');
  console.log('  EMPLOYEES (Main Nursery)');
  console.log('    ali.hassan@finecity.ae     — Ali Hassan   (~95% rate) ← top performer');
  console.log('    sara.ahmed@finecity.ae     — Sara Ahmed   (~80% rate)');
  console.log('    faisal.malik@finecity.ae   — Faisal Malik (~65% rate)');
  console.log('    nadia.rahman@finecity.ae   — Nadia Rahman (~55% rate)');
  console.log('  EMPLOYEES (Downtown)');
  console.log('    khalid.nasser@finecity.ae  — Khalid Nasser (~75% rate)');
  console.log('════════════════════════════════════════════════════════\n');
};

seed()
  .catch((err) => { console.error('Seed failed:', err); process.exit(1); })
  .finally(() => mongoose.connection.close());
