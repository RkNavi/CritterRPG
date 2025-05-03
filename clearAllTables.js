const db = require('./db/db');

async function clearAllTables() {
  try {
    // Get all user-defined table names in the public schema
    const result = await db.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `);

    const tables = result.rows.map(row => `"${row.tablename}"`).join(', ');

    if (tables.length === 0) {
      console.log('⚠️  No tables found to truncate.');
      return;
    }

    // Truncate all tables and reset identity columns
    await db.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
    console.log('🧼 All tables truncated and IDs reset!');
    process.exit();
  } catch (err) {
    console.error('❌ Error clearing tables:', err);
    process.exit(1);
  }
}

clearAllTables();