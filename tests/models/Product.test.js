const Product = require('../../models/Product');
const User = require('../../models/User');
const Farm = require('../../models/Farm');

describe('Product Model', () => {
  let testUser, testFarm, testProduct, farmId;

  beforeEach(async () => {
    // Create test user and farm for product tests
    testUser = testHelpers.createTestUser();
    testUser.tipo_usuario = 'campesino';
    const createdUser = await User.create(testUser);
    
    testFarm = testHelpers.createTestFarm(createdUser.id);
    const createdFarm = await Farm.create(testFarm);
    farmId = createdFarm.id;
    
    testProduct = testHelpers.createTestProduct(farmId);
  });

  describe('create', () => {
    test('should create a new product', async () => {
      const product = await Product.create(testProduct);
      
      expect(product).toBeDefined();
      expect(product.id).toBeDefined();
      expect(product.nombre).toBe(testProduct.nombre);
      expect(product.finca_id).toBe(testProduct.finca_id);
      expect(product.categoria).toBe(testProduct.categoria);
      expect(product.precio_kg).toBe(testProduct.precio_kg);
      expect(product.cantidad_disponible).toBe(testProduct.cantidad_disponible);
      expect(product.activo).toBe(true); // Default value
    });

    test('should throw error for missing required fields', async () => {
      delete testProduct.nombre;
      
      await expect(Product.create(testProduct)).rejects.toThrow();
    });

    test('should throw error for invalid finca_id', async () => {
      testProduct.finca_id = 99999;
      
      await expect(Product.create(testProduct)).rejects.toThrow();
    });

    test('should throw error for negative precio_kg', async () => {
      testProduct.precio_kg = -100;
      
      await expect(Product.create(testProduct)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    test('should find product by id', async () => {
      const createdProduct = await Product.create(testProduct);
      const foundProduct = await Product.findById(createdProduct.id);
      
      expect(foundProduct).toBeDefined();
      expect(foundProduct.id).toBe(createdProduct.id);
      expect(foundProduct.nombre).toBe(testProduct.nombre);
    });

    test('should return null for non-existent id', async () => {
      const product = await Product.findById(99999);
      
      expect(product).toBeNull();
    });
  });

  describe('findAll', () => {
    test('should return all active products', async () => {
      await Product.create(testProduct);
      const anotherProduct = { ...testProduct, nombre: 'Another Product' };
      await Product.create(anotherProduct);
      
      const products = await Product.findAll();
      
      expect(products).toBeDefined();
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThanOrEqual(2);
    });

    test('should filter by categoria when provided', async () => {
      await Product.create(testProduct);
      const vegetableProduct = { ...testProduct, nombre: 'Vegetable', categoria: 'verduras' };
      await Product.create(vegetableProduct);
      
      const fruitProducts = await Product.findAll({ categoria: 'frutas' });
      const vegetableProducts = await Product.findAll({ categoria: 'verduras' });
      
      expect(fruitProducts.every(p => p.categoria === 'frutas')).toBe(true);
      expect(vegetableProducts.every(p => p.categoria === 'verduras')).toBe(true);
    });
  });

  describe('findByFarmId', () => {
    test('should return products from specific farm', async () => {
      await Product.create(testProduct);
      const anotherProduct = { ...testProduct, nombre: 'Another Product' };
      await Product.create(anotherProduct);
      
      const farmProducts = await Product.findByFarmId(farmId);
      
      expect(farmProducts).toBeDefined();
      expect(Array.isArray(farmProducts)).toBe(true);
      expect(farmProducts.every(p => p.finca_id === farmId)).toBe(true);
    });

    test('should return empty array for farm with no products', async () => {
      // Create another farm
      const anotherUser = await User.create({ ...testUser, email: 'another@test.com' });
      const anotherFarm = await Farm.create({ ...testFarm, propietario_id: anotherUser.id, nombre: 'Another Farm' });
      
      const farmProducts = await Product.findByFarmId(anotherFarm.id);
      
      expect(farmProducts).toEqual([]);
    });
  });

  describe('update', () => {
    test('should update product information', async () => {
      const createdProduct = await Product.create(testProduct);
      const updateData = { 
        precio_kg: 6000, 
        cantidad_disponible: 150,
        descripcion: 'Updated description'
      };
      
      const updatedProduct = await Product.update(createdProduct.id, updateData);
      
      expect(updatedProduct).toBeDefined();
      expect(updatedProduct.precio_kg).toBe(updateData.precio_kg);
      expect(updatedProduct.cantidad_disponible).toBe(updateData.cantidad_disponible);
      expect(updatedProduct.descripcion).toBe(updateData.descripcion);
      expect(updatedProduct.nombre).toBe(testProduct.nombre); // Should remain unchanged
    });

    test('should throw error for invalid updates', async () => {
      const createdProduct = await Product.create(testProduct);
      
      await expect(Product.update(createdProduct.id, { precio_kg: -100 }))
        .rejects.toThrow();
    });
  });

  describe('delete', () => {
    test('should soft delete product (set activo to false)', async () => {
      const createdProduct = await Product.create(testProduct);
      
      const result = await Product.delete(createdProduct.id);
      expect(result).toBe(true);
      
      const deletedProduct = await Product.findById(createdProduct.id);
      expect(deletedProduct.activo).toBe(false);
    });

    test('should return false for non-existent product', async () => {
      const result = await Product.delete(99999);
      expect(result).toBe(false);
    });
  });

  describe('search', () => {
    test('should search products by name', async () => {
      await Product.create({ ...testProduct, nombre: 'Manzana Roja' });
      await Product.create({ ...testProduct, nombre: 'Pera Verde', categoria: 'frutas' });
      await Product.create({ ...testProduct, nombre: 'Tomate', categoria: 'verduras' });
      
      const results = await Product.search('manzana');
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.some(p => p.nombre.toLowerCase().includes('manzana'))).toBe(true);
    });
  });

  describe('updateStock', () => {
    test('should update product stock', async () => {
      const createdProduct = await Product.create(testProduct);
      const newStock = 75;
      
      const updatedProduct = await Product.updateStock(createdProduct.id, newStock);
      
      expect(updatedProduct).toBeDefined();
      expect(updatedProduct.cantidad_disponible).toBe(newStock);
    });

    test('should throw error for negative stock', async () => {
      const createdProduct = await Product.create(testProduct);
      
      await expect(Product.updateStock(createdProduct.id, -10))
        .rejects.toThrow();
    });
  });
});