const User = require('../../models/User');
const bcrypt = require('bcrypt');

describe('User Model', () => {
  let testUser;

  beforeEach(() => {
    testUser = testHelpers.createTestUser();
  });

  describe('create', () => {
    test('should create a new user with hashed password', async () => {
      const user = await User.create(testUser);
      
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(testUser.email);
      expect(user.nombre).toBe(testUser.nombre);
      expect(user.tipo_usuario).toBe(testUser.tipo_usuario);
      expect(user.password).not.toBe(testUser.password); // Should be hashed
      
      // Verify password was hashed
      const isValidPassword = await bcrypt.compare(testUser.password, user.password);
      expect(isValidPassword).toBe(true);
    });

    test('should throw error for duplicate email', async () => {
      await User.create(testUser);
      
      await expect(User.create(testUser)).rejects.toThrow();
    });

    test('should throw error for invalid email format', async () => {
      testUser.email = 'invalid-email';
      
      await expect(User.create(testUser)).rejects.toThrow();
    });

    test('should throw error for missing required fields', async () => {
      delete testUser.nombre;
      
      await expect(User.create(testUser)).rejects.toThrow();
    });
  });

  describe('findByEmail', () => {
    test('should find user by email', async () => {
      const createdUser = await User.create(testUser);
      const foundUser = await User.findByEmail(testUser.email);
      
      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(createdUser.id);
      expect(foundUser.email).toBe(testUser.email);
    });

    test('should return null for non-existent email', async () => {
      const user = await User.findByEmail('nonexistent@test.com');
      
      expect(user).toBeNull();
    });
  });

  describe('findById', () => {
    test('should find user by id', async () => {
      const createdUser = await User.create(testUser);
      const foundUser = await User.findById(createdUser.id);
      
      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(createdUser.id);
      expect(foundUser.email).toBe(testUser.email);
    });

    test('should return null for non-existent id', async () => {
      const user = await User.findById(99999);
      
      expect(user).toBeNull();
    });
  });

  describe('update', () => {
    test('should update user information', async () => {
      const createdUser = await User.create(testUser);
      const updateData = { nombre: 'Updated Name', telefono: '0987654321' };
      
      const updatedUser = await User.update(createdUser.id, updateData);
      
      expect(updatedUser).toBeDefined();
      expect(updatedUser.nombre).toBe(updateData.nombre);
      expect(updatedUser.telefono).toBe(updateData.telefono);
      expect(updatedUser.email).toBe(testUser.email); // Should remain unchanged
    });

    test('should hash password when updating', async () => {
      const createdUser = await User.create(testUser);
      const newPassword = 'newPassword123';
      
      const updatedUser = await User.update(createdUser.id, { password: newPassword });
      
      expect(updatedUser.password).not.toBe(newPassword);
      
      const isValidPassword = await bcrypt.compare(newPassword, updatedUser.password);
      expect(isValidPassword).toBe(true);
    });
  });

  describe('delete', () => {
    test('should delete user', async () => {
      const createdUser = await User.create(testUser);
      
      const result = await User.delete(createdUser.id);
      expect(result).toBe(true);
      
      const deletedUser = await User.findById(createdUser.id);
      expect(deletedUser).toBeNull();
    });

    test('should return false for non-existent user', async () => {
      const result = await User.delete(99999);
      expect(result).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('should validate correct password', async () => {
      const createdUser = await User.create(testUser);
      
      const isValid = await User.validatePassword(createdUser.id, testUser.password);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const createdUser = await User.create(testUser);
      
      const isValid = await User.validatePassword(createdUser.id, 'wrongpassword');
      expect(isValid).toBe(false);
    });
  });
});