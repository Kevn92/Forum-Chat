// fix-polls-is-active.js - Fix is_active field
require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixPolls() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('🔧 Connected to database\n');

    // Update all polls with is_active NULL to TRUE
    const [result] = await conn.query(
      'UPDATE polls SET is_active = 1 WHERE is_active IS NULL OR is_active = 0'
    );

    console.log(`✅ Fixed ${result.affectedRows} polls`);

    // Verify
    const [polls] = await conn.query('SELECT id, question, is_active FROM polls');
    console.log(`\n📊 Current polls:`);
    polls.forEach(p => {
      console.log(`  ID: ${p.id} | Question: ${p.question} | is_active: ${p.is_active}`);
    });

    await conn.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPolls();
