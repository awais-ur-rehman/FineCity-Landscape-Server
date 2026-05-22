/**
 * Full seed — clears all data then populates:
 *   1 super_admin · 2 admins · 3 employees
 *   2 branches · 5 zones · 5 categories · 7 plant types
 *   4 fertilizers · 7 plant batches · 12 care schedules
 *   ~40 care tasks (past completed + pending today/tomorrow)
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

const ACCOUNTS = {
  superAdmin: { email: 'awaisjarral37@gmail.com',  name: 'Awais Jarral',    phone: '+971501234001' },
  admin1:     { email: 'asadhanzlah@gmail.com',    name: 'Asad Hanzlah',    phone: '+971501234002' },
  admin2:     { email: 'omar.admin@finecity.ae',   name: 'Omar Al Farooq',  phone: '+971501234003' },
  emp1:       { email: 'ali.hassan@finecity.ae',   name: 'Ali Hassan',      phone: '+971501234004' },
  emp2:       { email: 'sara.ahmed@finecity.ae',   name: 'Sara Ahmed',      phone: '+971501234005' },
  emp3:       { email: 'khalid.nasser@finecity.ae',name: 'Khalid Nasser',   phone: '+971501234006' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const daysAgo  = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysFrom = (n: number) => new Date(Date.now() + n * 86_400_000);

const todayAt = (hh: number, mm = 0) => {
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
};

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

  // ── 2. Hash password ──────────────────────────────────────────────────────
  const hash = await bcrypt.hash(PASSWORD, 12);

  // ── 3. Branches ───────────────────────────────────────────────────────────
  console.log('  Creating branches…');
  const [mainBranch, downtownBranch] = await Branch.insertMany([
    {
      name: 'Main Nursery',
      code: 'MN-01',
      location: 'Al Warsan, Dubai',
      address: 'Warehouse District, Al Warsan 3, Dubai, UAE',
      contactPerson: 'Awais Jarral',
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

  // ── 4. Users ──────────────────────────────────────────────────────────────
  console.log('  Creating users…');
  await User.create({
    ...ACCOUNTS.superAdmin,
    role: 'super_admin',
    passwordHash: hash,
    isActive: true,
    branches: [mainBranch._id, downtownBranch._id],
    currentBranch: mainBranch._id,
  });

  const admin1 = await User.create({
    ...ACCOUNTS.admin1,
    role: 'branch_manager',
    passwordHash: hash,
    isActive: true,
    branches: [mainBranch._id],
    currentBranch: mainBranch._id,
  });

  const admin2 = await User.create({
    ...ACCOUNTS.admin2,
    role: 'branch_manager',
    passwordHash: hash,
    isActive: true,
    branches: [downtownBranch._id],
    currentBranch: downtownBranch._id,
  });

  const emp1 = await User.create({
    ...ACCOUNTS.emp1,
    role: 'employee',
    passwordHash: hash,
    isActive: true,
    branches: [mainBranch._id],
    currentBranch: mainBranch._id,
  });

  const emp2 = await User.create({
    ...ACCOUNTS.emp2,
    role: 'employee',
    passwordHash: hash,
    isActive: true,
    branches: [mainBranch._id],
    currentBranch: mainBranch._id,
  });

  const emp3 = await User.create({
    ...ACCOUNTS.emp3,
    role: 'employee',
    passwordHash: hash,
    isActive: true,
    branches: [downtownBranch._id],
    currentBranch: downtownBranch._id,
  });
  console.log('✓ Users created');

  // ── 5. Zones ──────────────────────────────────────────────────────────────
  console.log('  Creating zones…');
  const [zoneA, zoneB, zoneC, zoneSR, zoneRT] = await Zone.insertMany([
    { name: 'Zone A — Greenhouse',    code: 'Z-A',  branchId: mainBranch._id,     isActive: true },
    { name: 'Zone B — Shade Area',    code: 'Z-B',  branchId: mainBranch._id,     isActive: true },
    { name: 'Zone C — Outdoor Sun',   code: 'Z-C',  branchId: mainBranch._id,     isActive: true },
    { name: 'Showroom Floor',          code: 'SR-1', branchId: downtownBranch._id, isActive: true },
    { name: 'Rooftop Garden',          code: 'RT-1', branchId: downtownBranch._id, isActive: true },
  ]);
  console.log('✓ Zones created');

  // ── 6. Categories ─────────────────────────────────────────────────────────
  console.log('  Creating categories…');
  const [catIndoor, catOutdoor, catSucculent, catPalm] = await Category.insertMany([
    { name: 'Indoor Plants',    slug: 'indoor',     description: 'Suited to indoor low-light environments' },
    { name: 'Outdoor Plants',   slug: 'outdoor',    description: 'Thrive in direct sunlight and open air'  },
    { name: 'Succulents & Cacti', slug: 'succulent', description: 'Drought-tolerant desert plants'         },
    { name: 'Trees & Palms',    slug: 'palm',        description: 'Large woody palms and shade trees'       },
    { name: 'Herbs & Edibles',  slug: 'herb',        description: 'Aromatic and edible garden plants'       },
  ]);
  console.log('✓ Categories created');

  // ── 7. Plant Types ────────────────────────────────────────────────────────
  console.log('  Creating plant types…');
  const [ptAreca, ptSnake, ptMonstera, ptBougain, , ptAloe] =
    await PlantType.insertMany([
      {
        name: 'Areca Palm',
        scientificName: 'Dypsis lutescens',
        description: 'Popular feathery indoor palm with golden-yellow stems.',
        careInstructions: 'Bright indirect light. Water when top 2 cm of soil is dry. Mist leaves weekly.',
      },
      {
        name: 'Snake Plant',
        scientificName: 'Sansevieria trifasciata',
        description: 'Nearly indestructible air-purifying plant with upright leaves.',
        careInstructions: 'Tolerates low light. Water sparingly — every 2–6 weeks.',
      },
      {
        name: 'Monstera',
        scientificName: 'Monstera deliciosa',
        description: 'Iconic split-leaf tropical plant. Fast grower in good conditions.',
        careInstructions: 'Bright indirect light. Water every 1–2 weeks, let soil dry between.',
      },
      {
        name: 'Bougainvillea',
        scientificName: 'Bougainvillea glabra',
        description: 'Vibrant climbing/hedging plant with paper-thin bracts.',
        careInstructions: 'Full sun essential. Drought tolerant once established. Prune after flowering.',
      },
      {
        name: 'Date Palm',
        scientificName: 'Phoenix dactylifera',
        description: 'Iconic UAE palm producing edible dates.',
        careInstructions: 'Full sun. Deep watering every 1–2 weeks. High heat tolerance.',
      },
      {
        name: 'Aloe Vera',
        scientificName: 'Aloe barbadensis miller',
        description: 'Succulent with medicinal gel. Very low maintenance.',
        careInstructions: 'Bright indirect light. Water every 2–3 weeks. Well-draining soil essential.',
      },
      {
        name: 'Arabian Jasmine',
        scientificName: 'Jasminum sambac',
        description: "UAE's national flower — intensely fragrant white blooms.",
        careInstructions: 'Partial to full sun. Water regularly. Prune after blooming cycle.',
      },
    ]);
  console.log('✓ Plant types created');

  // ── 8. Fertilizers ────────────────────────────────────────────────────────
  console.log('  Creating fertilizers…');
  const [fertGreenGrow, fertBloomBoost, , fertShowGrow] =
    await Fertilizer.insertMany([
      {
        name: 'GreenGrow All-Purpose',
        brand: 'GreenGrow',
        type: 'organic',
        npkRatio: '5-5-5',
        description: 'Balanced organic feed for general plant health.',
        defaultDosage: 50,
        defaultUnit: 'ml',
        isActive: true,
        branchId: mainBranch._id,
        createdBy: admin1._id,
      },
      {
        name: 'BloomBoost Flowering',
        brand: 'BloomBoost',
        type: 'chemical',
        npkRatio: '5-10-5',
        description: 'High-phosphorus formula promotes heavy flowering.',
        defaultDosage: 30,
        defaultUnit: 'ml',
        isActive: true,
        branchId: mainBranch._id,
        createdBy: admin1._id,
      },
      {
        name: 'RootMax Stimulator',
        brand: 'RootMax',
        type: 'bio',
        npkRatio: '3-15-3',
        description: 'Bio-stimulant with mycorrhizae for strong root development.',
        defaultDosage: 20,
        defaultUnit: 'ml',
        isActive: true,
        branchId: mainBranch._id,
        createdBy: admin1._id,
      },
      {
        name: 'ShowGrow Premium',
        brand: 'ShowGrow',
        type: 'organic',
        npkRatio: '8-4-4',
        description: 'Premium slow-release organic pellets for showroom displays.',
        defaultDosage: 10,
        defaultUnit: 'g',
        isActive: true,
        branchId: downtownBranch._id,
        createdBy: admin2._id,
      },
    ]);
  console.log('✓ Fertilizers created');

  // ── 9. Plant Batches ──────────────────────────────────────────────────────
  console.log('  Creating plant batches…');
  const [
    batchAreca, batchSnake, batchMonstera, batchBougain, batchAloe,
    batchShowMonstera, batchDowntownPalm,
  ] = await PlantBatch.insertMany([
    // Main Nursery
    {
      name: 'Areca Palm — Batch A',
      plantType: ptAreca._id,
      scientificName: ptAreca.scientificName,
      category: catPalm._id,
      quantity: 50,
      zone: zoneA._id,
      location: 'Row 1, Greenhouse',
      notes: 'Supplier: Al Bustan Nurseries. Delivered Mar 2026.',
      status: 'active',
      branchId: mainBranch._id,
      createdBy: admin1._id,
    },
    {
      name: 'Snake Plant Collection',
      plantType: ptSnake._id,
      scientificName: ptSnake.scientificName,
      category: catIndoor._id,
      quantity: 120,
      zone: zoneB._id,
      location: 'Bench 3–5, Shade Area',
      notes: 'Mix of laurentii and moonshine cultivars.',
      status: 'active',
      branchId: mainBranch._id,
      createdBy: admin1._id,
    },
    {
      name: 'Monstera Display Stock',
      plantType: ptMonstera._id,
      scientificName: ptMonstera.scientificName,
      category: catIndoor._id,
      quantity: 35,
      zone: zoneA._id,
      location: 'Centre Aisle, Greenhouse',
      status: 'active',
      branchId: mainBranch._id,
      createdBy: admin1._id,
    },
    {
      name: 'Bougainvillea Row 1',
      plantType: ptBougain._id,
      scientificName: ptBougain.scientificName,
      category: catOutdoor._id,
      quantity: 40,
      zone: zoneC._id,
      location: 'South Fence Line',
      notes: 'Mixed pink/red/orange varieties.',
      status: 'active',
      branchId: mainBranch._id,
      createdBy: admin1._id,
    },
    {
      name: 'Aloe Vera Propagation',
      plantType: ptAloe._id,
      scientificName: ptAloe.scientificName,
      category: catSucculent._id,
      quantity: 200,
      zone: zoneB._id,
      location: 'Tray Rack B2',
      status: 'active',
      branchId: mainBranch._id,
      createdBy: admin1._id,
    },
    // Downtown Showroom
    {
      name: 'Showroom Monstera Feature',
      plantType: ptMonstera._id,
      scientificName: ptMonstera.scientificName,
      category: catIndoor._id,
      quantity: 15,
      zone: zoneSR._id,
      location: 'Feature Wall, Ground Floor',
      notes: 'High-visibility display stock — handle with care.',
      status: 'active',
      branchId: downtownBranch._id,
      createdBy: admin2._id,
    },
    {
      name: 'Premium Areca Palms — DT',
      plantType: ptAreca._id,
      scientificName: ptAreca.scientificName,
      category: catPalm._id,
      quantity: 20,
      zone: zoneRT._id,
      location: 'Rooftop Perimeter',
      status: 'active',
      branchId: downtownBranch._id,
      createdBy: admin2._id,
    },
  ]);
  console.log('✓ Plant batches created');

  // ── 10. Care Schedules ────────────────────────────────────────────────────
  console.log('  Creating care schedules…');
  const scheduleStart = daysAgo(30); // started a month ago

  const schedules = await CareSchedule.insertMany([
    // Areca Palm — Main
    {
      batchId: batchAreca._id, branchId: mainBranch._id,
      careType: 'watering', frequencyDays: 3, scheduledTime: '08:00',
      assignedTo: [emp1._id, emp2._id],
      instructions: 'Water thoroughly until drainage. Check soil moisture first.',
      startDate: scheduleStart, isActive: true, createdBy: admin1._id,
    },
    {
      batchId: batchAreca._id, branchId: mainBranch._id,
      careType: 'fertilizing', frequencyDays: 14, scheduledTime: '09:00',
      assignedTo: [emp1._id],
      instructions: 'Apply GreenGrow at 50ml per 5L water. Avoid leaf contact.',
      recommendedFertilizers: [fertGreenGrow._id],
      startDate: scheduleStart, isActive: true, createdBy: admin1._id,
    },
    // Snake Plant — Main
    {
      batchId: batchSnake._id, branchId: mainBranch._id,
      careType: 'watering', frequencyDays: 7, scheduledTime: '08:00',
      assignedTo: [emp2._id],
      instructions: 'Water only when top 3 cm is completely dry. Do not overwater.',
      startDate: scheduleStart, isActive: true, createdBy: admin1._id,
    },
    {
      batchId: batchSnake._id, branchId: mainBranch._id,
      careType: 'pruning', frequencyDays: 30, scheduledTime: '10:00',
      assignedTo: [emp1._id, emp2._id],
      instructions: 'Remove yellowed or damaged leaves at base with clean shears.',
      startDate: scheduleStart, isActive: true, createdBy: admin1._id,
    },
    // Monstera — Main
    {
      batchId: batchMonstera._id, branchId: mainBranch._id,
      careType: 'watering', frequencyDays: 4, scheduledTime: '08:00',
      assignedTo: [emp1._id],
      instructions: 'Water until drainage, then allow top 2 cm to dry before next watering.',
      startDate: scheduleStart, isActive: true, createdBy: admin1._id,
    },
    {
      batchId: batchMonstera._id, branchId: mainBranch._id,
      careType: 'fertilizing', frequencyDays: 21, scheduledTime: '09:00',
      assignedTo: [emp1._id],
      instructions: 'BloomBoost at 30ml per 5L. Apply monthly during growing season only.',
      recommendedFertilizers: [fertBloomBoost._id],
      startDate: scheduleStart, isActive: true, createdBy: admin1._id,
    },
    // Bougainvillea — Main
    {
      batchId: batchBougain._id, branchId: mainBranch._id,
      careType: 'watering', frequencyDays: 2, scheduledTime: '07:00',
      assignedTo: [emp2._id],
      instructions: 'Deep water at base only. Avoid wetting foliage to prevent fungal issues.',
      startDate: scheduleStart, isActive: true, createdBy: admin1._id,
    },
    {
      batchId: batchBougain._id, branchId: mainBranch._id,
      careType: 'pruning', frequencyDays: 30, scheduledTime: '10:00',
      assignedTo: [emp1._id, emp2._id],
      instructions: 'Hard prune after flowering. Wear gloves — thorns are sharp.',
      startDate: scheduleStart, isActive: true, createdBy: admin1._id,
    },
    // Aloe Vera — Main
    {
      batchId: batchAloe._id, branchId: mainBranch._id,
      careType: 'watering', frequencyDays: 10, scheduledTime: '08:00',
      assignedTo: [emp2._id],
      instructions: 'Soak and dry method. Water deeply, wait until soil is bone dry.',
      startDate: scheduleStart, isActive: true, createdBy: admin1._id,
    },
    // Showroom Monstera — Downtown
    {
      batchId: batchShowMonstera._id, branchId: downtownBranch._id,
      careType: 'watering', frequencyDays: 5, scheduledTime: '09:00',
      assignedTo: [emp3._id],
      instructions: 'Water carefully, avoid spilling on showroom floor. Use drip tray.',
      startDate: scheduleStart, isActive: true, createdBy: admin2._id,
    },
    // Downtown Areca — Downtown
    {
      batchId: batchDowntownPalm._id, branchId: downtownBranch._id,
      careType: 'watering', frequencyDays: 3, scheduledTime: '08:30',
      assignedTo: [emp3._id],
      instructions: 'Water rooftop plants early morning before peak heat.',
      startDate: scheduleStart, isActive: true, createdBy: admin2._id,
    },
    {
      batchId: batchDowntownPalm._id, branchId: downtownBranch._id,
      careType: 'fertilizing', frequencyDays: 14, scheduledTime: '09:00',
      assignedTo: [emp3._id],
      instructions: 'ShowGrow Premium — 10g per pot. Work into topsoil gently.',
      recommendedFertilizers: [fertShowGrow._id],
      startDate: scheduleStart, isActive: true, createdBy: admin2._id,
    },
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
  void schBougainPrune; // schedule exists — cron generates tasks
  console.log('✓ Care schedules created');

  // ── 11. Care Tasks ────────────────────────────────────────────────────────
  // Seed realistic tasks: past completed, some missed, today pending, tomorrow pending.
  // The cron will generate future tasks; these give immediate testing data.
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

  // Helper — generate historical + today tasks for a schedule
  const addTasks = (
    schedule: (typeof schedules)[0],
    batchId: mongoose.Types.ObjectId,
    branchId: mongoose.Types.ObjectId,
    careType: string,
    freq: number,
    assignedTo: mongoose.Types.ObjectId[],
    completedBy: mongoose.Types.ObjectId,
  ) => {
    // Past 30 days — generate occurrences
    for (let offset = 30; offset >= 0; offset -= freq) {
      const scheduledAt = daysAgo(offset);
      scheduledAt.setHours(8, 0, 0, 0);

      if (offset > 2) {
        // Old tasks — mostly completed, a couple missed
        const isMissed = offset % (freq * 4) === 0;
        tasks.push({
          scheduleId: schedule._id as mongoose.Types.ObjectId,
          batchId,
          branchId,
          careType,
          scheduledAt,
          status: isMissed ? 'missed' : 'completed',
          assignedTo,
          completedBy: isMissed ? undefined : completedBy,
          completedAt: isMissed ? undefined : new Date(scheduledAt.getTime() + 3_600_000),
          notes: isMissed ? undefined : 'Done.',
          notificationSent: true,
          reminderSent: true,
        });
      } else if (offset > 0) {
        // Yesterday — completed
        tasks.push({
          scheduleId: schedule._id as mongoose.Types.ObjectId,
          batchId,
          branchId,
          careType,
          scheduledAt,
          status: 'completed',
          assignedTo,
          completedBy,
          completedAt: new Date(scheduledAt.getTime() + 2_700_000),
          notes: 'Completed on schedule.',
          notificationSent: true,
          reminderSent: true,
        });
      }
    }

    // Today — pending
    const todayTask = todayAt(8);
    tasks.push({
      scheduleId: schedule._id as mongoose.Types.ObjectId,
      batchId,
      branchId,
      careType,
      scheduledAt: todayTask,
      status: 'pending',
      assignedTo,
      notificationSent: true,
      reminderSent: false,
    });

    // Tomorrow — pending
    const tomorrow = daysFrom(1);
    tomorrow.setHours(8, 0, 0, 0);
    tasks.push({
      scheduleId: schedule._id as mongoose.Types.ObjectId,
      batchId,
      branchId,
      careType,
      scheduledAt: tomorrow,
      status: 'pending',
      assignedTo,
      notificationSent: false,
      reminderSent: false,
    });
  };

  // Main Nursery schedules
  addTasks(schArecaWater,   batchAreca._id,    mainBranch._id,     'watering',    3,  [emp1._id, emp2._id], emp1._id);
  addTasks(schArecaFert,    batchAreca._id,    mainBranch._id,     'fertilizing', 14, [emp1._id],           emp1._id);
  addTasks(schSnakeWater,   batchSnake._id,    mainBranch._id,     'watering',    7,  [emp2._id],           emp2._id);
  addTasks(schSnakePrune,   batchSnake._id,    mainBranch._id,     'pruning',     30, [emp1._id, emp2._id], emp2._id);
  addTasks(schMonsteraWater,batchMonstera._id, mainBranch._id,     'watering',    4,  [emp1._id],           emp1._id);
  addTasks(schMonsteraFert, batchMonstera._id, mainBranch._id,     'fertilizing', 21, [emp1._id],           emp1._id);
  addTasks(schBougainWater, batchBougain._id,  mainBranch._id,     'watering',    2,  [emp2._id],           emp2._id);
  addTasks(schAloeWater,    batchAloe._id,     mainBranch._id,     'watering',    10, [emp2._id],           emp2._id);

  // Downtown schedules
  addTasks(schShowMonsteraWater, batchShowMonstera._id, downtownBranch._id, 'watering',    5,  [emp3._id], emp3._id);
  addTasks(schDtPalmWater,       batchDowntownPalm._id, downtownBranch._id, 'watering',    3,  [emp3._id], emp3._id);
  addTasks(schDtPalmFert,        batchDowntownPalm._id, downtownBranch._id, 'fertilizing', 14, [emp3._id], emp3._id);

  const insertedTasks = await CareTask.insertMany(tasks, { ordered: false });
  console.log(`✓ Care tasks created (${insertedTasks.length} total)`);

  // ── 12. FertilizerUsage records ──────────────────────────────────────────
  console.log('  Creating fertilizer usage records…');
  const completedFertilizingTasks = insertedTasks.filter(
    (t) => t.careType === 'fertilizing' && t.status === 'completed' && t.completedBy,
  );

  const fertilizerUsageDocs = completedFertilizingTasks.map((task) => {
    // Pick the fertilizer associated with this task's schedule
    let fertilizerId = fertGreenGrow._id;
    if (
      task.scheduleId.toString() === schArecaFert._id.toString() ||
      task.scheduleId.toString() === schDtPalmFert._id.toString()
    ) {
      fertilizerId = task.branchId.toString() === mainBranch._id.toString()
        ? fertGreenGrow._id
        : fertShowGrow._id;
    } else if (task.scheduleId.toString() === schMonsteraFert._id.toString()) {
      fertilizerId = fertBloomBoost._id;
    }

    return {
      taskId: task._id,
      scheduleId: task.scheduleId,
      batchId: task.batchId,
      branchId: task.branchId,
      completedBy: task.completedBy,
      recordedAt: task.completedAt ?? task.scheduledAt,
      usages: [{ fertilizerId, quantity: 50, unit: 'ml' as const }],
      notes: 'Applied as per schedule instructions.',
    };
  });

  if (fertilizerUsageDocs.length > 0) {
    await FertilizerUsage.insertMany(fertilizerUsageDocs, { ordered: false });
  }
  console.log(`✓ Fertilizer usage records created (${fertilizerUsageDocs.length} total)`);

  // ── 13. Print summary ─────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  SEED COMPLETE — Login credentials (password for all):');
  console.log(`  Password: ${PASSWORD}`);
  console.log('────────────────────────────────────────────────────────');
  console.log('  SUPER ADMIN');
  console.log(`    ${ACCOUNTS.superAdmin.email} — ${ACCOUNTS.superAdmin.name}`);
  console.log('  ADMINS');
  console.log(`    ${ACCOUNTS.admin1.email} — ${ACCOUNTS.admin1.name} (Main Nursery)`);
  console.log(`    ${ACCOUNTS.admin2.email} — ${ACCOUNTS.admin2.name} (Downtown)`);
  console.log('  EMPLOYEES');
  console.log(`    ${ACCOUNTS.emp1.email} — ${ACCOUNTS.emp1.name} (Main Nursery)`);
  console.log(`    ${ACCOUNTS.emp2.email} — ${ACCOUNTS.emp2.name} (Main Nursery)`);
  console.log(`    ${ACCOUNTS.emp3.email} — ${ACCOUNTS.emp3.name} (Downtown)`);
  console.log('════════════════════════════════════════════════════════\n');

};

seed()
  .catch((err) => { console.error('Seed failed:', err); process.exit(1); })
  .finally(() => mongoose.connection.close());
