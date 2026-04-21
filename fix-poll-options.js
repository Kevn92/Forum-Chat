// fix-poll-options.js - Clean poll option text
require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixPollOptions() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('🔧 Connected to database\n');

    const [polls] = await conn.query('SELECT id, options FROM polls');
    console.log(`Found ${polls.length} polls\n`);

    let fixedCount = 0;

    for (const poll of polls) {
      try {
        const options = JSON.parse(poll.options);
        let needsFix = false;

        const fixedOptions = options.map(opt => {
          let text = opt.text || '';
          
          // Remove "Option X:" prefix if exists
          const match = text.match(/^Option\s+\d+:\s*(.+)/i);
          if (match) {
            text = match[1].trim();
            needsFix = true;
            console.log(`  Poll ${poll.id}: "${opt.text}" -> "${text}"`);
          }

          return { ...opt, text };
        });

        if (needsFix) {
          await conn.query(
            'UPDATE polls SET options = ? WHERE id = ?',
            [JSON.stringify(fixedOptions), poll.id]
          );
          fixedCount++;
          console.log(`  ✅ Fixed poll ${poll.id}\n`);
        }
      } catch (e) {
        console.log(`  ❌ Error parsing poll ${poll.id}:`, e.message);
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} polls`);
    await conn.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPollOptions();
