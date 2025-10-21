// Jest test setup - Load environment variables before tests
require('dotenv').config();

// Ensure critical environment variables are set for tests
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 64) {
  process.env.JWT_SECRET = 'ac86ecb4889b0ab2b40d5af7854b4d89f7dc57e838c61dfeb3d735f49a86a137';
}
if (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET.length < 64) {
  process.env.COOKIE_SECRET = '21504d725a117213f514c68bf5db2115e8d8e52d68577f98f3114f0f3f3cb8b3';
}
