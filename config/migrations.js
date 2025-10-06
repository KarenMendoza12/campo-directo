const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');

class MigrationManager {
  constructor(dbConfig) {
    this.dbConfig = dbConfig;
    this.migrationsPath = path.join(__dirname, '..', 'migrations');
    this.connection = null;
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection(this.dbConfig);
      logger.info('Connected to database for migrations');
    } catch (error) {
      logger.error('Failed to connect to database for migrations', { error: error.message });
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      logger.info('Disconnected from database');
    }
  }

  async ensureMigrationsTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64) NOT NULL,
        INDEX idx_filename (filename)
      ) ENGINE=InnoDB;
    `;

    try {
      await this.connection.execute(createTableSQL);
      logger.info('Migrations table ensured');
    } catch (error) {
      logger.error('Failed to create migrations table', { error: error.message });
      throw error;
    }
  }

  async getExecutedMigrations() {
    try {
      const [rows] = await this.connection.execute(
        'SELECT filename, checksum FROM migrations ORDER BY executed_at ASC'
      );
      return rows;
    } catch (error) {
      logger.error('Failed to get executed migrations', { error: error.message });
      throw error;
    }
  }

  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsPath);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort();
    } catch (error) {
      logger.error('Failed to read migration files', { error: error.message });
      return [];
    }
  }

  async calculateChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async readMigrationFile(filename) {
    try {
      const filePath = path.join(this.migrationsPath, filename);
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      logger.error('Failed to read migration file', { filename, error: error.message });
      throw error;
    }
  }

  async executeMigration(filename, content) {
    const checksum = await this.calculateChecksum(content);
    
    try {
      // Begin transaction
      await this.connection.beginTransaction();

      // Split content into individual statements
      const statements = content
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      // Execute each statement
      for (const statement of statements) {
        if (statement.trim()) {
          await this.connection.execute(statement);
        }
      }

      // Record migration as executed
      await this.connection.execute(
        'INSERT INTO migrations (filename, checksum) VALUES (?, ?)',
        [filename, checksum]
      );

      // Commit transaction
      await this.connection.commit();
      
      logger.info('Migration executed successfully', { filename, checksum });
      return true;
    } catch (error) {
      // Rollback on error
      await this.connection.rollback();
      logger.error('Migration failed', { filename, error: error.message });
      throw error;
    }
  }

  async validateMigration(filename, content, executedMigration) {
    const currentChecksum = await this.calculateChecksum(content);
    
    if (executedMigration.checksum !== currentChecksum) {
      throw new Error(
        `Migration ${filename} has been modified after execution. ` +
        `Expected checksum: ${executedMigration.checksum}, ` +
        `Current checksum: ${currentChecksum}`
      );
    }
  }

  async runMigrations() {
    await this.connect();
    
    try {
      await this.ensureMigrationsTable();
      
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();
      
      const executedMap = new Map(
        executedMigrations.map(m => [m.filename, m])
      );

      logger.info('Starting migration process', {
        totalFiles: migrationFiles.length,
        executedCount: executedMigrations.length
      });

      let migrationsRun = 0;

      for (const filename of migrationFiles) {
        const content = await this.readMigrationFile(filename);
        
        if (executedMap.has(filename)) {
          // Validate existing migration
          await this.validateMigration(filename, content, executedMap.get(filename));
          logger.debug('Migration already executed', { filename });
        } else {
          // Execute new migration
          logger.info('Executing migration', { filename });
          await this.executeMigration(filename, content);
          migrationsRun++;
        }
      }

      logger.info('Migration process completed', { migrationsRun });
      return { success: true, migrationsRun };

    } catch (error) {
      logger.error('Migration process failed', { error: error.message });
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async rollbackMigration(filename) {
    await this.connect();
    
    try {
      // Check if migration exists
      const [rows] = await this.connection.execute(
        'SELECT * FROM migrations WHERE filename = ?',
        [filename]
      );

      if (rows.length === 0) {
        throw new Error(`Migration ${filename} not found in executed migrations`);
      }

      // Look for rollback file
      const rollbackFilename = filename.replace('.sql', '.rollback.sql');
      const rollbackPath = path.join(this.migrationsPath, rollbackFilename);

      try {
        const rollbackContent = await fs.readFile(rollbackPath, 'utf8');
        
        await this.connection.beginTransaction();

        // Execute rollback statements
        const statements = rollbackContent
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);

        for (const statement of statements) {
          if (statement.trim()) {
            await this.connection.execute(statement);
          }
        }

        // Remove migration from executed migrations
        await this.connection.execute(
          'DELETE FROM migrations WHERE filename = ?',
          [filename]
        );

        await this.connection.commit();
        
        logger.info('Migration rolled back successfully', { filename });
        return { success: true, filename };

      } catch (error) {
        await this.connection.rollback();
        if (error.code === 'ENOENT') {
          throw new Error(`Rollback file ${rollbackFilename} not found`);
        }
        throw error;
      }

    } finally {
      await this.disconnect();
    }
  }

  async createMigration(name) {
    const timestamp = new Date().toISOString()
      .replace(/[-T:.Z]/g, '')
      .slice(0, 14);
    
    const filename = `${timestamp}_${name}.sql`;
    const rollbackFilename = `${timestamp}_${name}.rollback.sql`;
    
    const migrationPath = path.join(this.migrationsPath, filename);
    const rollbackPath = path.join(this.migrationsPath, rollbackFilename);

    const migrationTemplate = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- Description: Add your migration description here

-- Add your SQL statements here
-- Example:
-- CREATE TABLE example_table (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
`;

    const rollbackTemplate = `-- Rollback: ${name}
-- Created: ${new Date().toISOString()}
-- Description: Rollback operations for ${name}

-- Add your rollback SQL statements here
-- Example:
-- DROP TABLE IF EXISTS example_table;
`;

    try {
      await fs.writeFile(migrationPath, migrationTemplate);
      await fs.writeFile(rollbackPath, rollbackTemplate);
      
      logger.info('Migration files created', { 
        migration: filename,
        rollback: rollbackFilename 
      });
      
      return {
        success: true,
        files: {
          migration: migrationPath,
          rollback: rollbackPath
        }
      };
    } catch (error) {
      logger.error('Failed to create migration files', { error: error.message });
      throw error;
    }
  }

  async getStatus() {
    await this.connect();
    
    try {
      await this.ensureMigrationsTable();
      
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();
      
      const status = {
        total: migrationFiles.length,
        executed: executedMigrations.length,
        pending: migrationFiles.length - executedMigrations.length,
        files: migrationFiles.map(filename => ({
          filename,
          executed: executedMigrations.some(m => m.filename === filename)
        }))
      };

      return status;
    } finally {
      await this.disconnect();
    }
  }
}

module.exports = MigrationManager;