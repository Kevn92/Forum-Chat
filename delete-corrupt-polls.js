// delete-corrupt-polls.js - Delete corrupt polls from database
require('dotenv').config();
const mysql = require('mysql2/promise');

async function deleteCorruptPolls() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('🔧 Connected to database\n');

    // Check polls
    const [polls] = await conn.query('SELECT * FROM polls');
    console.log(`Found ${polls.length} polls`);

    for (const poll of polls) {
      console.log(`\nPoll ID: ${poll.id}`);
      console.log(`  Question: ${poll.question}`);
      console.log(`  Options: ${poll.options}`);
      
      // Check if options contain arrays
      try {
        const options = JSON.parse(poll.options);
        let hasCorruptData = false;
        
        for (const opt of options) {
          if (Array.isArray(opt.votes)) {
            hasCorruptData = true;
            console.log(`  ❌ Corrupt votes in option ${opt.id}: ${JSON.stringify(opt.votes)}`);
          }
        }
        
        if (hasCorruptData) {
          // Delete this poll
          await conn.query('DELETE FROM polls WHERE id = ?', [poll.id]);
          console.log(`  🗑️  Deleted corrupt poll ${poll.id}`);
        }
      } catch (e) {
        console.log(`  ❌ Invalid JSON in options`);
        await conn.query('DELETE FROM polls WHERE id = ?', [poll.id]);
      }
    }

    console.log('\n✅ Cleanup completed');
    await conn.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteCorruptPolls();
