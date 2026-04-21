// fix-poll-data.js - Fix corrupt poll data in database
require('dotenv').config();
const sequelize = require('./config/database');
const Poll = require('./models/Poll');

async function fixPollData() {
  try {
    console.log('🔧 Starting poll data fix...\n');
    
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get all polls
    const polls = await Poll.findAll();
    console.log(`Found ${polls.length} polls\n`);

    let fixedCount = 0;
    
    for (const poll of polls) {
      const options = poll.options;
      let needsFix = false;
      
      // Fix each option
      const fixedOptions = options.map((opt, idx) => {
        let votes = opt.votes;
        
        // If votes is array, convert to number
        if (Array.isArray(votes)) {
          votes = typeof votes[0] === 'number' ? votes[0] : 0;
          needsFix = true;
          console.log(`  📝 Fixed poll ${poll.id}, option ${idx + 1}: ${JSON.stringify(opt.votes)} -> ${votes}`);
        }
        
        return {
          id: opt.id || (idx + 1),
          text: opt.text || '',
          votes: votes
        };
      });
      
      if (needsFix) {
        await poll.update({ options: fixedOptions });
        fixedCount++;
        console.log(`  ✅ Fixed poll ${poll.id}\n`);
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} polls`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

fixPollData();
