const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRoutes = require('../routes/auth');
const pool = require('../db/pool');

// Mock dependencies
jest.mock('../db/pool');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] }); // Email check
      bcrypt.hash.mockResolvedValueOnce('hashed_password');
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 'user-123', email: 'test@example.com', name: 'Test User' }]
      });
      jwt.sign.mockReturnValue('test-token');

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!',
          name: 'Test User'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(bcrypt.hash).toHaveBeenCalledWith('TestPass123!', 10);
    });

    it('should reject registration with existing email', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 'existing-user' }]
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'TestPass123!',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email already registered');
    });

    it('should validate password requirements', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValueOnce(true);
      jwt.sign.mockReturnValue('test-token');

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.password_hash).toBeUndefined();
    });

    it('should reject invalid credentials', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'WrongPass123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject incorrect password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValueOnce(false);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPass123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });
});