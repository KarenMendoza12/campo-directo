const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const Farm = require('../../models/Farm');
const Product = require('../../models/Product');

describe('Anti-Intermediarios Routes', () => {
  let farmerToken, buyerToken, farmerId, buyerId, farmId, productId;
  
  beforeEach(async () => {
    // Create test farmer
    const farmerData = {
      ...testHelpers.createTestUser(),
      email: 'farmer@test.com',
      tipo_usuario: 'campesino'
    };
    const farmerResponse = await request(app)
      .post('/api/auth/register')
      .send(farmerData);
    farmerToken = farmerResponse.body.token;
    farmerId = farmerResponse.body.user.id;

    // Create test buyer
    const buyerData = {
      ...testHelpers.createTestUser(),
      email: 'buyer@test.com',
      tipo_usuario: 'comprador'
    };
    const buyerResponse = await request(app)
      .post('/api/auth/register')
      .send(buyerData);
    buyerToken = buyerResponse.body.token;
    buyerId = buyerResponse.body.user.id;

    // Create test farm
    const farmData = testHelpers.createTestFarm(farmerId);
    const farm = await Farm.create(farmData);
    farmId = farm.id;

    // Create test product
    const productData = testHelpers.createTestProduct(farmId);
    const product = await Product.create(productData);
    productId = product.id;
  });

  describe('POST /api/anti-intermediarios/message/send', () => {
    test('should send message between farmer and buyer', async () => {
      const messageData = {
        receptor_id: buyerId,
        contenido: 'Hello, I have fresh tomatoes available!',
        tipo_mensaje: 'text'
      };

      const response = await request(app)
        .post('/api/anti-intermediarios/message/send')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
      expect(response.body.message.emisor_id).toBe(farmerId);
      expect(response.body.message.receptor_id).toBe(buyerId);
      expect(response.body.message.contenido).toBe(messageData.contenido);
    });

    test('should send price offer message', async () => {
      const priceOfferData = {
        receptor_id: buyerId,
        contenido: 'Special price for you: $4500/kg',
        tipo_mensaje: 'price_offer',
        metadata: {
          producto_id: productId,
          precio_ofertado: 4500,
          cantidad_kg: 50
        }
      };

      const response = await request(app)
        .post('/api/anti-intermediarios/message/send')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send(priceOfferData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message.tipo_mensaje).toBe('price_offer');
      expect(response.body.message.metadata.precio_ofertado).toBe(4500);
    });

    test('should require authentication', async () => {
      const messageData = {
        receptor_id: buyerId,
        contenido: 'Test message',
        tipo_mensaje: 'text'
      };

      await request(app)
        .post('/api/anti-intermediarios/message/send')
        .send(messageData)
        .expect(401);
    });
  });

  describe('GET /api/anti-intermediarios/conversations', () => {
    beforeEach(async () => {
      // Send a message to create a conversation
      await request(app)
        .post('/api/anti-intermediarios/message/send')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          receptor_id: buyerId,
          contenido: 'Initial message',
          tipo_mensaje: 'text'
        });
    });

    test('should get user conversations', async () => {
      const response = await request(app)
        .get('/api/anti-intermediarios/conversations')
        .set('Authorization', `Bearer ${farmerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.conversations)).toBe(true);
      expect(response.body.conversations.length).toBeGreaterThan(0);
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/anti-intermediarios/conversations')
        .expect(401);
    });
  });

  describe('GET /api/anti-intermediarios/messages/:conversationId', () => {
    let conversationId;

    beforeEach(async () => {
      // Send a message and get conversation ID
      const messageResponse = await request(app)
        .post('/api/anti-intermediarios/message/send')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          receptor_id: buyerId,
          contenido: 'Test conversation',
          tipo_mensaje: 'text'
        });
      
      conversationId = messageResponse.body.message.conversacion_id;
    });

    test('should get messages from conversation', async () => {
      const response = await request(app)
        .get(`/api/anti-intermediarios/messages/${conversationId}`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.messages)).toBe(true);
      expect(response.body.messages.length).toBeGreaterThan(0);
    });

    test('should require authentication', async () => {
      await request(app)
        .get(`/api/anti-intermediarios/messages/${conversationId}`)
        .expect(401);
    });
  });

  describe('GET /api/anti-intermediarios/price-comparison/:productId', () => {
    test('should get price comparison for product', async () => {
      const response = await request(app)
        .get(`/api/anti-intermediarios/price-comparison/${productId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.comparison).toBeDefined();
      expect(response.body.comparison.producto_id).toBe(productId);
    });

    test('should return error for non-existent product', async () => {
      await request(app)
        .get('/api/anti-intermediarios/price-comparison/99999')
        .expect(404);
    });
  });

  describe('GET /api/anti-intermediarios/savings-calculator', () => {
    test('should calculate savings for buyer', async () => {
      const response = await request(app)
        .get('/api/anti-intermediarios/savings-calculator')
        .query({
          producto_id: productId,
          cantidad_kg: 10
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.calculation).toBeDefined();
      expect(response.body.calculation.cantidad_kg).toBe(10);
      expect(response.body.calculation.ahorro_total).toBeDefined();
    });

    test('should require producto_id and cantidad_kg', async () => {
      await request(app)
        .get('/api/anti-intermediarios/savings-calculator')
        .expect(400);
    });
  });

  describe('GET /api/anti-intermediarios/price-history/:productId', () => {
    test('should get price history for product', async () => {
      const response = await request(app)
        .get(`/api/anti-intermediarios/price-history/${productId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.history)).toBe(true);
    });
  });

  describe('GET /api/anti-intermediarios/impact-report', () => {
    test('should get platform impact report', async () => {
      const response = await request(app)
        .get('/api/anti-intermediarios/impact-report')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.total_transacciones).toBeDefined();
      expect(response.body.report.total_ahorro_compradores).toBeDefined();
      expect(response.body.report.total_ingresos_extra_campesinos).toBeDefined();
    });
  });

  describe('POST /api/anti-intermediarios/savings-alert', () => {
    test('should create savings alert', async () => {
      const alertData = {
        producto_id: productId,
        precio_objetivo: 4000,
        activa: true
      };

      const response = await request(app)
        .post('/api/anti-intermediarios/savings-alert')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(alertData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.alert).toBeDefined();
      expect(response.body.alert.usuario_id).toBe(buyerId);
      expect(response.body.alert.precio_objetivo).toBe(alertData.precio_objetivo);
    });

    test('should require authentication', async () => {
      const alertData = {
        producto_id: productId,
        precio_objetivo: 4000
      };

      await request(app)
        .post('/api/anti-intermediarios/savings-alert')
        .send(alertData)
        .expect(401);
    });
  });

  describe('GET /api/anti-intermediarios/user-stats', () => {
    test('should get farmer stats', async () => {
      const response = await request(app)
        .get('/api/anti-intermediarios/user-stats')
        .set('Authorization', `Bearer ${farmerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.tipo_usuario).toBe('campesino');
    });

    test('should get buyer stats', async () => {
      const response = await request(app)
        .get('/api/anti-intermediarios/user-stats')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.tipo_usuario).toBe('comprador');
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/anti-intermediarios/user-stats')
        .expect(401);
    });
  });
});