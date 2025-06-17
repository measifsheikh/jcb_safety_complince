const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');

describe('Auth Endpoints', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/safety_test');
  });
  
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });
  
  beforeEach(async () => {
    await User.deleteMany({});
    
    // Create test user
    const testUser = new User({
      secretId: 'test123',
      password: 'password123',
      role: 'admin'
    });
    await testUser.save();
  });
  
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          secretId: 'test123',
          password: 'password123'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('secretId', 'test123');
    });
    
    it('should fail with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          secretId: 'test123',
          password: 'wrongpassword'
        });
      
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid credentials');
    });
  });
  
  describe('GET /api/auth/verify', () => {
    it('should verify valid token', async () => {
      // First login to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          secretId: 'test123',
          password: 'password123'
        });
      
      const token = loginRes.body.token;
      
      const res = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.user).toHaveProperty('secretId', 'test123');
    });
    
    it('should fail without token', async () => {
      const res = await request(app)
        .get('/api/auth/verify');
      
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', 'Access denied. No token provided.');
    });
  });
});