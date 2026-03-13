/**
 * Migration script to move data from JSON file to MySQL database
 * Run: node migrate-to-mysql.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function migrateData() {
  try {
    // Check if data.json exists
    const dataFile = path.join(__dirname, 'data.json');
    if (!fs.existsSync(dataFile)) {
      console.log('ℹ️  No data.json file found. Nothing to migrate.');
      process.exit(0);
    }

    // Read existing data
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    if (data.length === 0) {
      console.log('ℹ️  No items in data.json. Nothing to migrate.');
      process.exit(0);
    }

    console.log(`📦 Found ${data.length} items in data.json`);

    // Connect to MySQL
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
    });

    console.log('🔌 Connecting to MySQL...');
    const connection = await pool.getConnection();
    console.log('✓ Connected to MySQL');

    // Migrate each item
    let successCount = 0;
    let errorCount = 0;

    for (const item of data) {
      try {
        await connection.execute(
          'INSERT INTO items (id, name, notes, createdAt) VALUES (?, ?, ?, ?)',
          [
            item.id,
            item.name,
            item.notes || '',
            item.createdAt || new Date().toISOString()
          ]
        );
        successCount++;
        console.log(`✓ Migrated: ${item.name}`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to migrate ${item.name}:`, error.message);
      }
    }

    connection.release();
    pool.end();

    // Summary
    console.log('\n📊 Migration Summary');
    console.log(`   ✓ Successfully migrated: ${successCount} items`);
    if (errorCount > 0) {
      console.log(`   ✗ Failed: ${errorCount} items`);
    }
    console.log('\n✓ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    console.log('\n❓ Troubleshooting:');
    console.log('   1. Make sure .env file is configured with DB credentials');
    console.log('   2. Make sure MySQL database is created and accessible');
    console.log('   3. Check your internet connection');
    process.exit(1);
  }
}

migrateData();
