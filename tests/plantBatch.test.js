import { jest } from '@jest/globals';

// Mock nodemailer before any imports
jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
      verify: jest.fn().mockResolvedValue(true),
    }),
  },
}));

// Mock firebase-admin
jest.unstable_mockModule('firebase-admin', () => ({
  default: {
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
  },
}));

jest.unstable_mockModule('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(false),
}));

import { setupDB } from './setup.js';

setupDB();

let app, request, User, PlantBatch, jwt;

beforeAll(async () => {
  const supertest = await import('supertest');
  request = supertest.default;

  const appModule = await import('../src/index.js');
  app = appModule.default;

  const userModule = await import('../src/models/User.js');
  User = userModule.default;

  const batchModule = await import('../src/models/PlantBatch.js');
  PlantBatch = batchModule.default;

  const jwtModule = await import('jsonwebtoken');
  jwt = jwtModule.default;
});

/** Helper to create a user and return a JWT token */
const createUserToken = async (role = 'admin') => {
  const user = await User.create({
    email: `${role}-${Date.now()}@test.com`,
    name: `${role} User`,
    role,
  });
  const token = jwt.sign(
    { userId: user._id, email: user.email, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' },
  );
  return { user, token };
};

/** Helper to create a sample batch in DB */
const createSampleBatch = async (adminId, overrides = {}) => {
  return PlantBatch.create({
    name: 'Areca Palm - Zone A',
    plantType: 'Areca Palm',
    scientificName: 'Dypsis lutescens',
    category: 'indoor',
    quantity: 50,
    zone: 'A',
    location: 'Greenhouse 1',
    notes: 'Test batch',
    createdBy: adminId,
    ...overrides,
  });
};

describe('Plant Batch API', () => {
  describe('POST /api/v1/plant-batches', () => {
    it('should allow admin to create a plant batch', async () => {
      const { token } = await createUserToken('admin');

      const res = await request(app)
        .post('/api/v1/plant-batches')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Snake Plant - Zone B',
          plantType: 'Snake Plant',
          scientificName: 'Sansevieria trifasciata',
          category: 'indoor',
          quantity: 30,
          zone: 'B',
          location: 'Greenhouse 2',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Snake Plant - Zone B');
      expect(res.body.data.plantType).toBe('Snake Plant');
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.isDeleted).toBe(false);
    });

    it('should reject employee creating a batch', async () => {
      const { token } = await createUserToken('employee');

      const res = await request(app)
        .post('/api/v1/plant-batches')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test',
          plantType: 'Test Plant',
        });

      expect(res.status).toBe(403);
    });

    it('should reject invalid category', async () => {
      const { token } = await createUserToken('admin');

      const res = await request(app)
        .post('/api/v1/plant-batches')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Bad Batch',
          plantType: 'Test',
          category: 'invalid-category',
        });

      expect(res.status).toBe(400);
    });

    it('should require name and plantType', async () => {
      const { token } = await createUserToken('admin');

      const res = await request(app)
        .post('/api/v1/plant-batches')
        .set('Authorization', `Bearer ${token}`)
        .send({ zone: 'A' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/plant-batches', () => {
    let adminToken, employeeToken, adminUser;

    beforeEach(async () => {
      const admin = await createUserToken('admin');
      const employee = await createUserToken('employee');
      adminToken = admin.token;
      adminUser = admin.user;
      employeeToken = employee.token;

      // Seed batches
      await createSampleBatch(adminUser._id, { name: 'Areca Palm - Zone A', plantType: 'Areca Palm', zone: 'A', category: 'indoor' });
      await createSampleBatch(adminUser._id, { name: 'Snake Plant - Zone B', plantType: 'Snake Plant', zone: 'B', category: 'indoor' });
      await createSampleBatch(adminUser._id, { name: 'Bougainvillea - Zone D', plantType: 'Bougainvillea', zone: 'D', category: 'outdoor' });
      await createSampleBatch(adminUser._id, { name: 'Aloe Vera - Zone F', plantType: 'Aloe Vera', zone: 'F', category: 'cactus' });
      await createSampleBatch(adminUser._id, { name: 'Deleted Batch', plantType: 'Ghost', isDeleted: true });
    });

    it('should return all non-deleted batches for admin', async () => {
      const res = await request(app)
        .get('/api/v1/plant-batches')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.batches).toHaveLength(4);
      expect(res.body.data.pagination.total).toBe(4);
    });

    it('should return batches for employee (read access)', async () => {
      const res = await request(app)
        .get('/api/v1/plant-batches')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.batches).toHaveLength(4);
    });

    it('should filter by zone', async () => {
      const res = await request(app)
        .get('/api/v1/plant-batches?zone=A')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.batches).toHaveLength(1);
      expect(res.body.data.batches[0].zone).toBe('A');
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get('/api/v1/plant-batches?category=outdoor')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.batches).toHaveLength(1);
      expect(res.body.data.batches[0].plantType).toBe('Bougainvillea');
    });

    it('should search by name', async () => {
      const res = await request(app)
        .get('/api/v1/plant-batches?search=areca')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.batches).toHaveLength(1);
      expect(res.body.data.batches[0].plantType).toBe('Areca Palm');
    });

    it('should search by plantType', async () => {
      const res = await request(app)
        .get('/api/v1/plant-batches?search=snake')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.batches).toHaveLength(1);
    });

    it('should not return soft-deleted batches', async () => {
      const res = await request(app)
        .get('/api/v1/plant-batches?search=ghost')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.batches).toHaveLength(0);
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/api/v1/plant-batches?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.batches).toHaveLength(2);
      expect(res.body.data.pagination.total).toBe(4);
      expect(res.body.data.pagination.pages).toBe(2);
      expect(res.body.data.pagination.page).toBe(1);
    });

    it('should return page 2', async () => {
      const res = await request(app)
        .get('/api/v1/plant-batches?page=2&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.batches).toHaveLength(2);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/v1/plant-batches');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/plant-batches/:id', () => {
    it('should return a single batch', async () => {
      const { user, token } = await createUserToken('admin');
      const batch = await createSampleBatch(user._id);

      const res = await request(app)
        .get(`/api/v1/plant-batches/${batch._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Areca Palm - Zone A');
    });

    it('should return 404 for deleted batch', async () => {
      const { user, token } = await createUserToken('admin');
      const batch = await createSampleBatch(user._id, { isDeleted: true });

      const res = await request(app)
        .get(`/api/v1/plant-batches/${batch._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent ID', async () => {
      const { token } = await createUserToken('admin');
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .get(`/api/v1/plant-batches/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should allow employee to read a batch', async () => {
      const admin = await createUserToken('admin');
      const { token } = await createUserToken('employee');
      const batch = await createSampleBatch(admin.user._id);

      const res = await request(app)
        .get(`/api/v1/plant-batches/${batch._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/v1/plant-batches/:id', () => {
    it('should allow admin to update a batch', async () => {
      const { user, token } = await createUserToken('admin');
      const batch = await createSampleBatch(user._id);

      const res = await request(app)
        .put(`/api/v1/plant-batches/${batch._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Areca Palm', quantity: 75 });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Areca Palm');
      expect(res.body.data.quantity).toBe(75);
    });

    it('should reject employee updating a batch', async () => {
      const admin = await createUserToken('admin');
      const { token } = await createUserToken('employee');
      const batch = await createSampleBatch(admin.user._id);

      const res = await request(app)
        .put(`/api/v1/plant-batches/${batch._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(403);
    });

    it('should return 404 for deleted batch', async () => {
      const { user, token } = await createUserToken('admin');
      const batch = await createSampleBatch(user._id, { isDeleted: true });

      const res = await request(app)
        .put(`/api/v1/plant-batches/${batch._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Cant Update' });

      expect(res.status).toBe(404);
    });

    it('should allow archiving a batch', async () => {
      const { user, token } = await createUserToken('admin');
      const batch = await createSampleBatch(user._id);

      const res = await request(app)
        .put(`/api/v1/plant-batches/${batch._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'archived' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('archived');
    });
  });

  describe('DELETE /api/v1/plant-batches/:id', () => {
    it('should soft-delete a batch (admin)', async () => {
      const { user, token } = await createUserToken('admin');
      const batch = await createSampleBatch(user._id);

      const res = await request(app)
        .delete(`/api/v1/plant-batches/${batch._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      // Verify it's soft-deleted
      const deleted = await PlantBatch.findById(batch._id);
      expect(deleted.isDeleted).toBe(true);
    });

    it('should reject employee deleting a batch', async () => {
      const admin = await createUserToken('admin');
      const { token } = await createUserToken('employee');
      const batch = await createSampleBatch(admin.user._id);

      const res = await request(app)
        .delete(`/api/v1/plant-batches/${batch._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for already-deleted batch', async () => {
      const { user, token } = await createUserToken('admin');
      const batch = await createSampleBatch(user._id, { isDeleted: true });

      const res = await request(app)
        .delete(`/api/v1/plant-batches/${batch._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should not appear in GET after deletion', async () => {
      const { user, token } = await createUserToken('admin');
      const batch = await createSampleBatch(user._id);

      await request(app)
        .delete(`/api/v1/plant-batches/${batch._id}`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(app)
        .get('/api/v1/plant-batches')
        .set('Authorization', `Bearer ${token}`);

      const ids = res.body.data.batches.map((b) => b._id);
      expect(ids).not.toContain(batch._id.toString());
    });
  });
});
