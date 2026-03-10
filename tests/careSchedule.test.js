import { jest } from '@jest/globals';

jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
      verify: jest.fn().mockResolvedValue(true),
    }),
  },
}));

jest.unstable_mockModule('firebase-admin', () => ({
  default: {
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
    apps: [],
  },
}));

jest.unstable_mockModule('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(false),
}));

import { setupDB } from './setup.js';

setupDB();

let app, request, User, PlantBatch, CareSchedule, CareTask, jwt;

beforeAll(async () => {
  const supertest = await import('supertest');
  request = supertest.default;

  const appModule = await import('../src/index.js');
  app = appModule.default;

  User = (await import('../src/models/User.js')).default;
  PlantBatch = (await import('../src/models/PlantBatch.js')).default;
  CareSchedule = (await import('../src/models/CareSchedule.js')).default;
  CareTask = (await import('../src/models/CareTask.js')).default;
  jwt = (await import('jsonwebtoken')).default;
});

const makeToken = (user) =>
  jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' },
  );

const createAdmin = async () => {
  const user = await User.create({
    email: `admin-${Date.now()}@test.com`,
    name: 'Admin',
    role: 'admin',
  });
  return { user, token: makeToken(user) };
};

const createEmployee = async () => {
  const user = await User.create({
    email: `emp-${Date.now()}@test.com`,
    name: 'Employee',
    role: 'employee',
  });
  return { user, token: makeToken(user) };
};

const createBatch = async (adminId) =>
  PlantBatch.create({
    name: 'Areca Palm - Zone A',
    plantType: 'Areca Palm',
    category: 'indoor',
    quantity: 50,
    zone: 'A',
    location: 'Greenhouse 1',
    createdBy: adminId,
  });

describe('Care Schedule API', () => {
  describe('POST /api/v1/care-schedules', () => {
    it('should create a schedule and generate tasks', async () => {
      const { user, token } = await createAdmin();
      const batch = await createBatch(user._id);

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const res = await request(app)
        .post('/api/v1/care-schedules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          batchId: batch._id.toString(),
          careType: 'watering',
          frequencyDays: 3,
          scheduledTime: '08:00',
          assignedTo: [],
          instructions: 'Water thoroughly, check drainage',
          startDate: today.toISOString(),
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.careType).toBe('watering');
      expect(res.body.data.frequencyDays).toBe(3);

      // Verify tasks were generated
      const tasks = await CareTask.find({ scheduleId: res.body.data._id });
      expect(tasks.length).toBeGreaterThan(0);

      // All generated tasks should be in the future or today
      tasks.forEach((t) => {
        expect(new Date(t.scheduledAt).getTime()).toBeGreaterThanOrEqual(today.getTime());
      });
    });

    it('should reject non-admin', async () => {
      const admin = await createAdmin();
      const { token } = await createEmployee();
      const batch = await createBatch(admin.user._id);

      const res = await request(app)
        .post('/api/v1/care-schedules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          batchId: batch._id.toString(),
          careType: 'watering',
          frequencyDays: 1,
          scheduledTime: '09:00',
          startDate: new Date().toISOString(),
        });

      expect(res.status).toBe(403);
    });

    it('should reject invalid careType', async () => {
      const { user, token } = await createAdmin();
      const batch = await createBatch(user._id);

      const res = await request(app)
        .post('/api/v1/care-schedules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          batchId: batch._id.toString(),
          careType: 'dancing',
          frequencyDays: 1,
          scheduledTime: '09:00',
          startDate: new Date().toISOString(),
        });

      expect(res.status).toBe(400);
    });

    it('should reject invalid time format', async () => {
      const { user, token } = await createAdmin();
      const batch = await createBatch(user._id);

      const res = await request(app)
        .post('/api/v1/care-schedules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          batchId: batch._id.toString(),
          careType: 'watering',
          frequencyDays: 1,
          scheduledTime: '25:00',
          startDate: new Date().toISOString(),
        });

      expect(res.status).toBe(400);
    });

    it('should reject non-existent batch', async () => {
      const { token } = await createAdmin();

      const res = await request(app)
        .post('/api/v1/care-schedules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          batchId: '507f1f77bcf86cd799439011',
          careType: 'watering',
          frequencyDays: 1,
          scheduledTime: '09:00',
          startDate: new Date().toISOString(),
        });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/care-schedules', () => {
    it('should list schedules with filters', async () => {
      const { user, token } = await createAdmin();
      const batch = await createBatch(user._id);

      await CareSchedule.create({
        batchId: batch._id,
        careType: 'watering',
        frequencyDays: 3,
        scheduledTime: '08:00',
        startDate: new Date(),
        createdBy: user._id,
        isActive: true,
      });
      await CareSchedule.create({
        batchId: batch._id,
        careType: 'fertilizer',
        frequencyDays: 14,
        scheduledTime: '10:00',
        startDate: new Date(),
        createdBy: user._id,
        isActive: true,
      });

      const res = await request(app)
        .get('/api/v1/care-schedules?careType=watering')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.schedules).toHaveLength(1);
      expect(res.body.data.schedules[0].careType).toBe('watering');
    });
  });

  describe('PUT /api/v1/care-schedules/:id', () => {
    it('should update schedule and regenerate tasks when frequency changes', async () => {
      const { user, token } = await createAdmin();
      const batch = await createBatch(user._id);

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // Create schedule with frequency 2
      const createRes = await request(app)
        .post('/api/v1/care-schedules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          batchId: batch._id.toString(),
          careType: 'pruning',
          frequencyDays: 2,
          scheduledTime: '14:00',
          startDate: today.toISOString(),
        });

      const scheduleId = createRes.body.data._id;
      const oldTaskCount = await CareTask.countDocuments({ scheduleId });

      // Update frequency to 1 (daily)
      const res = await request(app)
        .put(`/api/v1/care-schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ frequencyDays: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.frequencyDays).toBe(1);

      // More tasks should exist now (daily vs every 2 days)
      const newTaskCount = await CareTask.countDocuments({
        scheduleId,
        status: 'pending',
      });
      expect(newTaskCount).toBeGreaterThanOrEqual(oldTaskCount);
    });
  });

  describe('DELETE /api/v1/care-schedules/:id', () => {
    it('should deactivate schedule and cancel future tasks', async () => {
      const { user, token } = await createAdmin();
      const batch = await createBatch(user._id);

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const createRes = await request(app)
        .post('/api/v1/care-schedules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          batchId: batch._id.toString(),
          careType: 'repotting',
          frequencyDays: 7,
          scheduledTime: '09:00',
          startDate: today.toISOString(),
        });

      const scheduleId = createRes.body.data._id;

      const res = await request(app)
        .delete(`/api/v1/care-schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      // Schedule should be deactivated
      const schedule = await CareSchedule.findById(scheduleId);
      expect(schedule.isActive).toBe(false);

      // Future pending tasks should be skipped
      const futurePendingTasks = await CareTask.find({
        scheduleId,
        status: 'pending',
        scheduledAt: { $gte: new Date() },
      });
      expect(futurePendingTasks).toHaveLength(0);
    });
  });

  describe('End-to-end: schedule → tasks → complete → stats', () => {
    it('should flow from schedule creation to stats', async () => {
      const { user, token } = await createAdmin();
      const employee = await createEmployee();
      const batch = await createBatch(user._id);

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // 1. Create schedule assigned to employee
      const createRes = await request(app)
        .post('/api/v1/care-schedules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          batchId: batch._id.toString(),
          careType: 'watering',
          frequencyDays: 1,
          scheduledTime: '08:00',
          assignedTo: [employee.user._id.toString()],
          instructions: 'Water daily',
          startDate: today.toISOString(),
        });

      expect(createRes.status).toBe(201);

      // 2. Verify tasks were generated
      const tasks = await CareTask.find({
        scheduleId: createRes.body.data._id,
      }).sort({ scheduledAt: 1 });

      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0].assignedTo.map((id) => id.toString())).toContain(
        employee.user._id.toString(),
      );

      // 3. Complete the first task as employee
      const firstTask = tasks[0];
      const completeRes = await request(app)
        .post(`/api/v1/care-tasks/${firstTask._id}/complete`)
        .set('Authorization', `Bearer ${employee.token}`)
        .send({ notes: 'Watered all plants' });

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.status).toBe('completed');
      expect(completeRes.body.data.notes).toBe('Watered all plants');

      // 4. Check stats
      const nextWeek = new Date(today);
      nextWeek.setUTCDate(nextWeek.getUTCDate() + 14);

      const statsRes = await request(app)
        .get(
          `/api/v1/care-tasks/stats?from=${today.toISOString()}&to=${nextWeek.toISOString()}`,
        )
        .set('Authorization', `Bearer ${token}`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.data.completed).toBeGreaterThanOrEqual(1);
      expect(statsRes.body.data.total).toBeGreaterThan(0);
      expect(statsRes.body.data.completionRate).toBeGreaterThan(0);
    });
  });
});
