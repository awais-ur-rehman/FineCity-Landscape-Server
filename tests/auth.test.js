import { jest } from '@jest/globals';

// Mock nodemailer before any imports
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test' });
const mockVerify = jest.fn().mockResolvedValue(true);

jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: mockSendMail,
      verify: mockVerify,
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

// Mock fs for firebase config
jest.unstable_mockModule('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(false),
}));

import { setupDB } from './setup.js';

setupDB();

// Dynamic imports after mocks are set up
let app, request, User, Otp, bcrypt, jwt;

beforeAll(async () => {
  const supertest = await import('supertest');
  request = supertest.default;

  const appModule = await import('../src/index.js');
  app = appModule.default;

  const userModule = await import('../src/models/User.js');
  User = userModule.default;

  const otpModule = await import('../src/models/Otp.js');
  Otp = otpModule.default;

  const bcryptModule = await import('bcryptjs');
  bcrypt = bcryptModule.default;

  const jwtModule = await import('jsonwebtoken');
  jwt = jwtModule.default;
});

describe('Auth API', () => {
  describe('POST /api/v1/auth/send-otp', () => {
    it('should send OTP for a valid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('OTP sent successfully');
      expect(mockSendMail).toHaveBeenCalled();

      // Verify OTP was saved in DB
      const otp = await Otp.findOne({ email: 'test@example.com' });
      expect(otp).not.toBeNull();
      expect(otp.attempts).toBe(0);
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/verify-otp', () => {
    const email = 'verify@example.com';
    const plainOtp = '123456';

    beforeEach(async () => {
      const hashedOtp = await bcrypt.hash(plainOtp, 10);
      await Otp.create({
        email,
        otp: hashedOtp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
    });

    it('should verify valid OTP and return tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email, otp: plainOtp });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(email);
    });

    it('should reject invalid OTP and track attempts', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email, otp: '999999' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid OTP');

      const otpRecord = await Otp.findOne({ email });
      expect(otpRecord.attempts).toBe(1);
    });

    it('should reject after max attempts', async () => {
      // Use up all 3 attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/v1/auth/verify-otp')
          .send({ email, otp: '999999' });
      }

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email, otp: '999999' });

      expect(res.status).toBe(400);
      expect(
        res.body.message.includes('Maximum OTP attempts exceeded') ||
        res.body.message.includes('No OTP found'),
      ).toBe(true);
    });

    it('should reject expired OTP', async () => {
      await Otp.deleteMany({ email });
      const hashedOtp = await bcrypt.hash(plainOtp, 10);
      await Otp.create({
        email,
        otp: hashedOtp,
        expiresAt: new Date(Date.now() - 1000), // already expired
      });

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email, otp: plainOtp });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('expired');
    });

    it('should create new user on first login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email, otp: plainOtp });

      expect(res.status).toBe(200);
      const user = await User.findOne({ email });
      expect(user).not.toBeNull();
      expect(user.role).toBe('employee');
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // Create a user with a refresh token
      const user = await User.create({
        email: 'refresh@example.com',
        name: 'Refresh User',
        role: 'employee',
      });

      const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '30d' },
      );

      user.refreshToken = refreshToken;
      await user.save();

      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      // New refresh token should be different (rotation)
      expect(res.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject reused refresh token', async () => {
      const user = await User.create({
        email: 'reuse@example.com',
        name: 'Reuse User',
        role: 'employee',
      });

      const oldToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '30d' },
      );

      // Store a different token (simulating rotation already happened)
      user.refreshToken = 'some-other-token';
      await user.save();

      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: oldToken });

      expect(res.status).toBe(401);
    });
  });

  describe('Protected routes', () => {
    let adminToken, employeeToken, adminUser, employeeUser;

    beforeEach(async () => {
      adminUser = await User.create({
        email: 'admin@test.com',
        name: 'Admin',
        role: 'admin',
      });
      employeeUser = await User.create({
        email: 'employee@test.com',
        name: 'Employee',
        role: 'employee',
      });

      adminToken = jwt.sign(
        { userId: adminUser._id, email: adminUser.email, role: 'admin' },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' },
      );
      employeeToken = jwt.sign(
        { userId: employeeUser._id, email: employeeUser.email, role: 'employee' },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' },
      );
    });

    it('should allow access with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject request with no token', async () => {
      const res = await request(app).get('/api/v1/users');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: adminUser._id, email: adminUser.email, role: 'admin' },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '0s' },
      );

      // Small delay to ensure expiry
      await new Promise((r) => setTimeout(r, 100));

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });
  });

  describe('RBAC', () => {
    let adminToken, employeeToken;

    beforeEach(async () => {
      const adminUser = await User.create({
        email: 'rbac-admin@test.com',
        name: 'Admin',
        role: 'admin',
      });
      const employeeUser = await User.create({
        email: 'rbac-employee@test.com',
        name: 'Employee',
        role: 'employee',
      });

      adminToken = jwt.sign(
        { userId: adminUser._id, email: adminUser.email, role: 'admin' },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' },
      );
      employeeToken = jwt.sign(
        { userId: employeeUser._id, email: employeeUser.email, role: 'employee' },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' },
      );
    });

    it('should allow admin to access admin-only routes', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should deny employee access to admin-only routes', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow admin to create employees', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'new@employee.com', name: 'New Employee' });

      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe('new@employee.com');
    });

    it('should deny employee from creating users', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ email: 'hack@attempt.com', name: 'Hacker' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear refresh token on logout', async () => {
      const user = await User.create({
        email: 'logout@test.com',
        name: 'Logout User',
        role: 'employee',
        refreshToken: 'some-refresh-token',
      });

      const token = jwt.sign(
        { userId: user._id, email: user.email, role: 'employee' },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' },
      );

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const updated = await User.findById(user._id);
      expect(updated.refreshToken).toBeNull();
    });
  });

  describe('Health check', () => {
    it('should return 200', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/v1/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
