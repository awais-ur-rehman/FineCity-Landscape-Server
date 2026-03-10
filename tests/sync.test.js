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

  app = (await import('../src/index.js')).default;
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

/**
 * Seed a full scenario: admin, employee, batch, schedule, 3 tasks assigned to employee.
 */
const seedScenario = async () => {
  const admin = await User.create({
    email: `admin-${Date.now()}@test.com`,
    name: 'Admin',
    role: 'admin',
  });

  const employee = await User.create({
    email: `emp-${Date.now()}@test.com`,
    name: 'Employee',
    role: 'employee',
  });

  const batch = await PlantBatch.create({
    name: 'Areca Palm - Zone A',
    plantType: 'Areca Palm',
    category: 'indoor',
    quantity: 50,
    zone: 'A',
    location: 'Greenhouse 1',
    createdBy: admin._id,
  });

  const now = new Date();
  const schedule = await CareSchedule.create({
    batchId: batch._id,
    careType: 'watering',
    frequencyDays: 1,
    scheduledTime: '08:00',
    startDate: now,
    createdBy: admin._id,
    assignedTo: [employee._id],
    isActive: true,
  });

  const tasks = [];
  for (let i = 0; i < 3; i++) {
    const scheduledAt = new Date(now);
    scheduledAt.setUTCDate(scheduledAt.getUTCDate() + i);
    scheduledAt.setUTCHours(8, 0, 0, 0);

    tasks.push(
      await CareTask.create({
        scheduleId: schedule._id,
        batchId: batch._id,
        careType: 'watering',
        scheduledAt,
        assignedTo: [employee._id],
        status: 'pending',
      }),
    );
  }

  return { admin, employee, batch, schedule, tasks };
};

describe('Sync API', () => {
  describe('POST /api/v1/sync', () => {
    it('should return tasks, batches, and schedules updated since lastSyncAt', async () => {
      const { employee, batch, schedule, tasks } = await seedScenario();
      const token = makeToken(employee);

      // lastSyncAt in the past — should get all data
      const lastSyncAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/v1/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({ lastSyncAt, completedTasks: [] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Should have tasks
      expect(res.body.data.tasks.length).toBe(3);

      // Should have the batch
      expect(res.body.data.batches.length).toBe(1);
      expect(res.body.data.batches[0].name).toBe('Areca Palm - Zone A');

      // Should have the schedule
      expect(res.body.data.schedules.length).toBeGreaterThanOrEqual(1);

      // syncedAt should be a valid date
      expect(new Date(res.body.data.syncedAt).getTime()).toBeGreaterThan(0);

      // user.lastSyncAt should be updated
      const updatedUser = await User.findById(employee._id);
      expect(updatedUser.lastSyncAt).toBeTruthy();
    });

    it('should process offline completions', async () => {
      const { employee, tasks } = await seedScenario();
      const token = makeToken(employee);

      const completedAt = new Date().toISOString();
      const lastSyncAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/v1/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({
          lastSyncAt,
          completedTasks: [
            { taskId: tasks[0]._id.toString(), completedAt, notes: 'Done offline' },
            { taskId: tasks[1]._id.toString(), completedAt },
          ],
        });

      expect(res.status).toBe(200);

      // Verify completion results
      expect(res.body.data.completionResults).toHaveLength(2);
      expect(res.body.data.completionResults[0].status).toBe('completed');
      expect(res.body.data.completionResults[1].status).toBe('completed');

      // Verify tasks are actually completed in DB
      const task0 = await CareTask.findById(tasks[0]._id);
      expect(task0.status).toBe('completed');
      expect(task0.notes).toBe('Done offline');
      expect(task0.completedBy.toString()).toBe(employee._id.toString());

      const task1 = await CareTask.findById(tasks[1]._id);
      expect(task1.status).toBe('completed');
    });

    it('should skip already-completed tasks (idempotency)', async () => {
      const { employee, tasks } = await seedScenario();
      const token = makeToken(employee);

      // Pre-complete task
      tasks[0].status = 'completed';
      tasks[0].completedBy = employee._id;
      tasks[0].completedAt = new Date();
      await tasks[0].save();

      const lastSyncAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/v1/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({
          lastSyncAt,
          completedTasks: [
            { taskId: tasks[0]._id.toString(), completedAt: new Date().toISOString() },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.completionResults[0].status).toBe('already_completed');
    });

    it('should skip missed tasks during offline completion', async () => {
      const { employee, tasks } = await seedScenario();
      const token = makeToken(employee);

      // Mark task as missed
      tasks[0].status = 'missed';
      await tasks[0].save();

      const lastSyncAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/v1/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({
          lastSyncAt,
          completedTasks: [
            { taskId: tasks[0]._id.toString(), completedAt: new Date().toISOString() },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.completionResults[0].status).toBe('already_missed');

      // Task should still be missed
      const task = await CareTask.findById(tasks[0]._id);
      expect(task.status).toBe('missed');
    });

    it('should handle non-existent taskId in completions', async () => {
      const { employee } = await seedScenario();
      const token = makeToken(employee);

      const lastSyncAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/v1/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({
          lastSyncAt,
          completedTasks: [
            { taskId: '507f1f77bcf86cd799439011', completedAt: new Date().toISOString() },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.completionResults[0].status).toBe('not_found');
    });

    it('should only return tasks assigned to the requesting employee', async () => {
      const { admin, employee, batch, schedule } = await seedScenario();

      // Create another employee with separate tasks
      const otherEmp = await User.create({
        email: `other-${Date.now()}@test.com`,
        name: 'Other',
        role: 'employee',
      });

      const otherSchedule = await CareSchedule.create({
        batchId: batch._id,
        careType: 'fertilizer',
        frequencyDays: 7,
        scheduledTime: '10:00',
        startDate: new Date(),
        createdBy: admin._id,
        assignedTo: [otherEmp._id],
        isActive: true,
      });

      const otherTaskTime = new Date();
      otherTaskTime.setUTCHours(10, 0, 0, 0);
      await CareTask.create({
        scheduleId: otherSchedule._id,
        batchId: batch._id,
        careType: 'fertilizer',
        scheduledAt: otherTaskTime,
        assignedTo: [otherEmp._id],
        status: 'pending',
      });

      const lastSyncAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const token = makeToken(employee);

      const res = await request(app)
        .post('/api/v1/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({ lastSyncAt, completedTasks: [] });

      expect(res.status).toBe(200);

      // Should not contain the other employee's tasks
      const taskCareTypes = res.body.data.tasks.map((t) => t.careType);
      expect(taskCareTypes).not.toContain('fertilizer');
    });

    it('should return empty data for future lastSyncAt', async () => {
      const { employee } = await seedScenario();
      const token = makeToken(employee);

      // lastSyncAt far in the future — nothing updated since
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/v1/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({ lastSyncAt: futureDate, completedTasks: [] });

      expect(res.status).toBe(200);
      expect(res.body.data.tasks).toHaveLength(0);
      expect(res.body.data.schedules).toHaveLength(0);
    });

    it('should reject unauthenticated sync', async () => {
      const res = await request(app)
        .post('/api/v1/sync')
        .send({ lastSyncAt: new Date().toISOString(), completedTasks: [] });

      expect(res.status).toBe(401);
    });

    it('should reject sync without lastSyncAt', async () => {
      const { employee } = await seedScenario();
      const token = makeToken(employee);

      const res = await request(app)
        .post('/api/v1/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({ completedTasks: [] });

      expect(res.status).toBe(400);
    });

    it('should be idempotent — multiple syncs produce same result', async () => {
      const { employee, tasks } = await seedScenario();
      const token = makeToken(employee);
      const lastSyncAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const completedAt = new Date().toISOString();

      const payload = {
        lastSyncAt,
        completedTasks: [
          { taskId: tasks[0]._id.toString(), completedAt, notes: 'First sync' },
        ],
      };

      // First sync
      const res1 = await request(app)
        .post('/api/v1/sync')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res1.status).toBe(200);
      expect(res1.body.data.completionResults[0].status).toBe('completed');

      // Second sync with same payload
      const res2 = await request(app)
        .post('/api/v1/sync')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res2.status).toBe(200);
      expect(res2.body.data.completionResults[0].status).toBe('already_completed');

      // Task state should be unchanged
      const task = await CareTask.findById(tasks[0]._id);
      expect(task.status).toBe('completed');
      expect(task.notes).toBe('First sync');
    });
  });
});
