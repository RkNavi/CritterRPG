const db = require('./db');

async function testConnection() {
  try {
    const result = await db.query('SELECT NOW()');
    console.log('✅ Connected to database! Server time:', result.rows[0].now);
    process.exit();
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
}

testConnection();