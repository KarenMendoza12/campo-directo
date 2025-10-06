#!/usr/bin/env node

const MigrationManager = require('../config/migrations');
const dbConfig = require('../config/database');

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];
const name = args[1];

const migrationManager = new MigrationManager(dbConfig);

async function showHelp() {
  console.log(`
Migration Commands:

  node scripts/migrate.js run                    - Run all pending migrations
  node scripts/migrate.js status                 - Show migration status
  node scripts/migrate.js create <name>          - Create a new migration
  node scripts/migrate.js rollback <filename>    - Rollback a specific migration

Examples:
  node scripts/migrate.js run
  node scripts/migrate.js status
  node scripts/migrate.js create add_user_preferences
  node scripts/migrate.js rollback 20231205_add_user_preferences.sql
`);
}

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...\n');
    const result = await migrationManager.runMigrations();
    
    if (result.migrationsRun > 0) {
      console.log(`✅ Successfully ran ${result.migrationsRun} migration(s)`);
    } else {
      console.log('✅ Database is up to date - no migrations needed');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

async function showStatus() {
  try {
    console.log('📊 Migration Status:\n');
    const status = await migrationManager.getStatus();
    
    console.log(`Total migrations: ${status.total}`);
    console.log(`Executed: ${status.executed}`);
    console.log(`Pending: ${status.pending}\n`);
    
    if (status.files.length > 0) {
      console.log('Migration Files:');
      status.files.forEach(file => {
        const status = file.executed ? '✅' : '⏳';
        console.log(`  ${status} ${file.filename}`);
      });
    } else {
      console.log('No migration files found');
    }
  } catch (error) {
    console.error('❌ Failed to get status:', error.message);
    process.exit(1);
  }
}

async function createMigration(name) {
  if (!name) {
    console.error('❌ Migration name is required');
    console.log('Usage: node scripts/migrate.js create <name>');
    process.exit(1);
  }

  try {
    console.log(`📝 Creating new migration: ${name}\n`);
    const result = await migrationManager.createMigration(name);
    
    console.log('✅ Migration files created:');
    console.log(`   Migration: ${result.files.migration}`);
    console.log(`   Rollback:  ${result.files.rollback}`);
    console.log('\n📝 Edit these files to add your SQL statements');
  } catch (error) {
    console.error('❌ Failed to create migration:', error.message);
    process.exit(1);
  }
}

async function rollbackMigration(filename) {
  if (!filename) {
    console.error('❌ Migration filename is required');
    console.log('Usage: node scripts/migrate.js rollback <filename>');
    process.exit(1);
  }

  try {
    console.log(`⏪ Rolling back migration: ${filename}\n`);
    const result = await migrationManager.rollbackMigration(filename);
    
    console.log(`✅ Successfully rolled back: ${result.filename}`);
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  switch (command) {
    case 'run':
      await runMigrations();
      break;
    
    case 'status':
      await showStatus();
      break;
    
    case 'create':
      await createMigration(name);
      break;
    
    case 'rollback':
      await rollbackMigration(name);
      break;
    
    case 'help':
    case '--help':
    case '-h':
      await showHelp();
      break;
    
    default:
      console.error('❌ Unknown command:', command || 'none');
      await showHelp();
      process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error.message);
  process.exit(1);
});

// Run the CLI
main().catch(console.error);