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

let app, request, User, PlantBatch, CareSchedule, CareTask, jwt, taskGeneratorService;

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
  taskGeneratorService = await import('../src/services/taskGenerator.service.js');
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

const createEmployee = async (suffix = '') => {
  const user = await User.create({
    email: `emp-${suffix || Date.now()}@test.com`,
    name: `Employee ${suffix}`,
    role: 'employee',
  });
  return { user, token: makeToken(user) };
};

const createBatch = async (adminId) =>
  PlantBatch.create({
    name: 'Test Palm',
    plantType: 'Areca Palm',
    category: 'indoor',
    quantity: 50,
    zone: 'A',
    location: 'GH1',
    createdBy: adminId,
  });

/**
 * Helper to create a schedule and its tasks directly in DB.
 */
const seedScheduleWithTasks = async (adminId, employeeId, batchId, overrides = {}) => {
  const now = new Date();
  const schedule = await CareSchedule.create({
    batchId,
    careType: 'watering',
    frequencyDays: 1,
    scheduledTime: '08:00',
    startDate: now,
    createdBy: adminId,
    assignedTo: employeeId ? [employeeId] : [],
    isActive: true,
    ...overrides,
  });

  // Create tasks manually for test control
  const tasks = [];
  for (let i = 0; i < 5; i++) {
    const scheduledAt = new Date(now);
    scheduledAt.setUTCDate(scheduledAt.getUTCDate() + i);
    scheduledAt.setUTCHours(8, 0, 0, 0);

    tasks.push(
      await CareTask.create({
        scheduleId: schedule._id,
        batchId,
        careType: schedule.careType,
        scheduledAt,
        assignedTo: schedule.assignedTo,
        status: 'pending',
      }),
    );
  }

  return { schedule, tasks };
};

describe('Care Task API', () => {
  describe('GET /api/v1/care-tasks', () => {
    it('should list all tasks for admin', async () => {
      const { user, token } = await createAdmin();
      const batch = await createBatch(user._id);
      await seedScheduleWithTasks(user._id, null, batch._id);

      const res = await request(app)
        .get('/api/v1/care-tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tasks.length).toBeGreaterThan(0);
    });

    it('should auto-filter tasks for employee', async () => {
      const admin = await createAdmin();
      const emp1 = await createEmployee('filter1');
      const emp2 = await createEmployee('filter2');
      const batch = await createBatch(admin.user._id);

      await seedScheduleWithTasks(admin.user._id, emp1.user._id, batch._id);
      await seedScheduleWithTasks(admin.user._id, emp2.user._id, batch._id, {
        careType: 'fertilizer',
        scheduledTime: '10:00',
      });

      // emp1 should only see their tasks
      const res = await request(app)
        .get('/api/v1/care-tasks')
        .set('Authorization', `Bearer ${emp1.token}`);

      expect(res.status).toBe(200);
      res.body.data.tasks.forEach((task) => {
        const assignedIds = task.assignedTo.map((u) => u._id);
        expect(assignedIds).toContain(emp1.user._id.toString());
      });
    });

    it('should filter by status', async () => {
      const { user, token } = await createAdmin();
      const batch = await createBatch(user._id);
      const { tasks } = await seedScheduleWithTasks(user._id, null, batch._id);

      // Complete one task
      tasks[0].status = 'completed';
      tasks[0].completedBy = user._id;
      tasks[0].completedAt = new Date();
      await tasks[0].save();

      const res = await request(app)
        .get('/api/v1/care-tasks?status=completed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      res.body.data.tasks.forEach((t) => {
        expect(t.status).toBe('completed');
      });
    });

    it('should filter by careType', async () => {
      const { user, token } = await createAdmin();
      const batch = await createBatch(user._id);
      await seedScheduleWithTasks(user._id, null, batch._id);
      await seedScheduleWithTasks(user._id, null, batch._id, {
        careType: 'pruning',
        scheduledTime: '12:00',
      });

      const res = await request(app)
        .get('/api/v1/care-tasks?careType=pruning')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tasks.length).toBeGreaterThan(0);
      res.body.data.tasks.forEach((t) => {
        expect(t.careType).toBe('pruning');
      });
    });

    it('should filter by date range', async () => {
      const { user, token } = await createAdmin();
      const batch = await createBatch(user._id);
      await seedScheduleWithTasks(user._id, null, batch._id);

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(23, 59, 59, 999);

      const res = await request(app)
        .get(`/api/v1/care-tasks?from=${today.toISOString()}&to=${tomorrow.toISOString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      res.body.data.tasks.forEach((t) => {
        const sched = new Date(t.scheduledAt);
        expect(sched.getTime()).toBeGreaterThanOrEqual(today.getTime());
        expect(sched.getTime()).toBeLessThanOrEqual(tomorrow.getTime());
      });
    });

    it('should paginate', async () => {
      const { user, token } = await createAdmin();
      const batch = await createBatch(user._id);
      await seedScheduleWithTasks(user._id, null, batch._id);

      const res = await request(app)
        .get('/api/v1/care-tasks?limit=2&page=1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tasks).toHaveLength(2);
      expect(res.body.data.pagination.total).toBeGreaterThan(2);
    });
  });

  describe('POST /api/v1/care-tasks/:id/complete', () => {
    it('should mark task as completed', async () => {
      const admin = await createAdmin();
      const emp = await createEmployee('comp1');
      const batch = await createBatch(admin.user._id);
      const { tasks } = await seedScheduleWithTasks(
        admin.user._id,
        emp.user._id,
        batch._id,
      );

      const res = await request(app)
        .post(`/api/v1/care-tasks/${tasks[0]._id}/complete`)
        .set('Authorization', `Bearer ${emp.token}`)
        .send({ notes: 'Done watering' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.notes).toBe('Done watering');
      expect(res.body.data.completedBy).toBeTruthy();
    });

    it('should reject completing already-completed task', async () => {
      const admin = await createAdmin();
      const batch = await createBatch(admin.user._id);
      const { tasks } = await seedScheduleWithTasks(admin.user._id, null, batch._id);

      // Complete once
      await request(app)
        .post(`/api/v1/care-tasks/${tasks[0]._id}/complete`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({});

      // Try again
      const res = await request(app)
        .post(`/api/v1/care-tasks/${tasks[0]._id}/complete`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already completed');
    });

    it('should accept custom completedAt', async () => {
      const admin = await createAdmin();
      const batch = await createBatch(admin.user._id);
      const { tasks } = await seedScheduleWithTasks(admin.user._id, null, batch._id);

      const customTime = '2026-02-25T10:30:00.000Z';
      const res = await request(app)
        .post(`/api/v1/care-tasks/${tasks[1]._id}/complete`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ completedAt: customTime });

      expect(res.status).toBe(200);
      expect(res.body.data.completedAt).toBe(customTime);
    });
  });

  describe('POST /api/v1/care-tasks/:id/skip', () => {
    it('should skip task (admin only)', async () => {
      const admin = await createAdmin();
      const batch = await createBatch(admin.user._id);
      const { tasks } = await seedScheduleWithTasks(admin.user._id, null, batch._id);

      const res = await request(app)
        .post(`/api/v1/care-tasks/${tasks[0]._id}/skip`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ reason: 'Rained today' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('skipped');
      expect(res.body.data.skipReason).toBe('Rained today');
    });

    it('should reject skip from employee', async () => {
      const admin = await createAdmin();
      const emp = await createEmployee('skip1');
      const batch = await createBatch(admin.user._id);
      const { tasks } = await seedScheduleWithTasks(
        admin.user._id,
        emp.user._id,
        batch._id,
      );

      const res = await request(app)
        .post(`/api/v1/care-tasks/${tasks[0]._id}/skip`)
        .set('Authorization', `Bearer ${emp.token}`)
        .send({ reason: 'Trying to skip' });

      expect(res.status).toBe(403);
    });

    it('should reject skip without reason', async () => {
      const admin = await createAdmin();
      const batch = await createBatch(admin.user._id);
      const { tasks } = await seedScheduleWithTasks(admin.user._id, null, batch._id);

      const res = await request(app)
        .post(`/api/v1/care-tasks/${tasks[0]._id}/skip`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should reject skipping completed task', async () => {
      const admin = await createAdmin();
      const batch = await createBatch(admin.user._id);
      const { tasks } = await seedScheduleWithTasks(admin.user._id, null, batch._id);

      // Complete first
      tasks[0].status = 'completed';
      tasks[0].completedAt = new Date();
      await tasks[0].save();

      const res = await request(app)
        .post(`/api/v1/care-tasks/${tasks[0]._id}/skip`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ reason: 'Too late' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot skip a completed');
    });
  });

  describe('Task generator: mark overdue as missed', () => {
    it('should mark old pending tasks as missed', async () => {
      const admin = await createAdmin();
      const batch = await createBatch(admin.user._id);
      const schedule = await CareSchedule.create({
        batchId: batch._id,
        careType: 'general',
        frequencyDays: 1,
        scheduledTime: '06:00',
        startDate: new Date(),
        createdBy: admin.user._id,
        isActive: true,
      });

      // Create a task 3 hours in the past
      const pastTime = new Date(Date.now() - 3 * 60 * 60 * 1000);
      await CareTask.create({
        scheduleId: schedule._id,
        batchId: batch._id,
        careType: 'general',
        scheduledAt: pastTime,
        status: 'pending',
      });

      const missed = await taskGeneratorService.markOverdueTasks();
      expect(missed).toBeGreaterThanOrEqual(1);

      const task = await CareTask.findOne({
        scheduleId: schedule._id,
        scheduledAt: pastTime,
      });
      expect(task.status).toBe('missed');
    });
  });

  describe('GET /api/v1/care-tasks/stats', () => {
    it('should return stats for admin', async () => {
      const admin = await createAdmin();
      const emp = await createEmployee('stats1');
      const batch = await createBatch(admin.user._id);
      const { tasks } = await seedScheduleWithTasks(
        admin.user._id,
        emp.user._id,
        batch._id,
      );

      // Complete 2, skip 1
      tasks[0].status = 'completed';
      tasks[0].completedBy = emp.user._id;
      tasks[0].completedAt = new Date();
      await tasks[0].save();

      tasks[1].status = 'completed';
      tasks[1].completedBy = emp.user._id;
      tasks[1].completedAt = new Date();
      await tasks[1].save();

      tasks[2].status = 'skipped';
      tasks[2].skippedBy = admin.user._id;
      tasks[2].skipReason = 'Rain';
      await tasks[2].save();

      const from = new Date();
      from.setUTCDate(from.getUTCDate() - 1);
      const to = new Date();
      to.setUTCDate(to.getUTCDate() + 10);

      const res = await request(app)
        .get(`/api/v1/care-tasks/stats?from=${from.toISOString()}&to=${to.toISOString()}`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.completed).toBe(2);
      expect(res.body.data.skipped).toBe(1);
      expect(res.body.data.total).toBe(5);
      expect(res.body.data.completionRate).toBe(40);
      expect(res.body.data.byEmployee).toHaveLength(1);
      expect(res.body.data.byEmployee[0].completedCount).toBe(2);
      expect(res.body.data.byCareType).toHaveProperty('watering');
    });

    it('should reject stats from employee', async () => {
      const { token } = await createEmployee('statsreject');

      const res = await request(app)
        .get('/api/v1/care-tasks/stats?from=2026-02-01&to=2026-02-28')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
