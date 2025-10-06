const { Pool } = require('pg');

// Test database configuration
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/campo_directo_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

// Global test setup
beforeAll(async () => {
  // Setup test database if needed
  console.log('Setting up tests...');
});

afterAll(async () => {
  // Cleanup after all tests
  console.log('Cleaning up tests...');
});

// Helper functions for tests
global.testHelpers = {
  // Create test user
  createTestUser: () => ({
    nombre: 'Test User',
    email: 'test@test.com',
    telefono: '1234567890',
    tipo_usuario: 'comprador',
    password: 'testPassword123'
  }),

  // Create test farm
  createTestFarm: (userId) => ({
    nombre: 'Test Farm',
    propietario_id: userId,
    ubicacion: 'Test Location',
    area_hectareas: 10.5,
    certificaciones: ['organico'],
    descripcion: 'Test farm description'
  }),

  // Create test product
  createTestProduct: (farmId) => ({
    nombre: 'Test Product',
    finca_id: farmId,
    categoria: 'frutas',
    precio_kg: 5000,
    cantidad_disponible: 100,
    descripcion: 'Test product description',
    imagen_url: 'http://example.com/image.jpg'
  }),

  // Create test order
  createTestOrder: (buyerId, productId) => ({
    comprador_id: buyerId,
    producto_id: productId,
    cantidad_kg: 10,
    precio_total: 50000,
    estado: 'pendiente',
    fecha_entrega: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  })
};