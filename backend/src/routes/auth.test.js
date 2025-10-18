const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./auth');
const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../db/pool');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

// Setup express app for testing
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      // Mock database response
      pool.query.mockResolvedValueOnce({ rows: [] }); // Email check
      bcrypt.hash.mockResolvedValueOnce('hashedPassword');
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        }]
      });
      jwt.sign.mockReturnValueOnce('test-token');

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          name: 'Test User'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(bcrypt.hash).toHaveBeenCalledWith('SecurePass123!', 10);
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject registration with existing email', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 'existing-user' }]
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'SecurePass123!',
          name: 'Test User'
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('User already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValueOnce(true);
      jwt.sign.mockReturnValueOnce('test-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject login with invalid password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashedPassword'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValueOnce(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePass123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      // Mock refresh token verification
      jwt.verify.mockReturnValueOnce({
        id: 'user-123',
        jti: 'refresh-jti',
        type: 'refresh',
        exp: Date.now() / 1000 + 3600
      });

      // Mock blacklist check (token not blacklisted)
      pool.query.mockResolvedValueOnce({ rows: [] });

      // Mock user lookup
      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      // Mock new access token generation
      jwt.sign.mockReturnValueOnce('new-access-token');

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['refreshToken=valid-refresh-token']);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Access token refreshed successfully');
      expect(response.body).toHaveProperty('token');
      expect(jwt.verify).toHaveBeenCalled();
      expect(pool.query).toHaveBeenCalledTimes(2); // Blacklist check + user lookup
    });

    it('should reject refresh with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Refresh token required');
    });

    it('should reject refresh with invalid token type', async () => {
      // Mock access token instead of refresh token
      jwt.verify.mockReturnValueOnce({
        id: 'user-123',
        jti: 'access-jti',
        type: 'access', // Wrong type
        exp: Date.now() / 1000 + 3600
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['refreshToken=access-token']);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token type');
    });

    it('should reject refresh with blacklisted token', async () => {
      jwt.verify.mockReturnValueOnce({
        id: 'user-123',
        jti: 'blacklisted-jti',
        type: 'refresh',
        exp: Date.now() / 1000 + 3600
      });

      // Mock blacklist check (token IS blacklisted)
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['refreshToken=blacklisted-token']);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Refresh token has been revoked');
    });

    it('should reject refresh with expired token', async () => {
      jwt.verify.mockImplementationOnce(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['refreshToken=expired-token']);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Refresh token has expired');
      expect(response.body.requiresLogin).toBe(true);
    });

    it('should reject refresh when user not found', async () => {
      jwt.verify.mockReturnValueOnce({
        id: 'deleted-user-123',
        jti: 'refresh-jti',
        type: 'refresh',
        exp: Date.now() / 1000 + 3600
      });

      // Mock blacklist check (not blacklisted)
      pool.query.mockResolvedValueOnce({ rows: [] });

      // Mock user lookup (user not found)
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['refreshToken=valid-token-deleted-user']);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('User not found');
    });
  });
});