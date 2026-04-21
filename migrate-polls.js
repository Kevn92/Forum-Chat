// migrate-polls.js - Script to fix polls database schema
require('dotenv').config();
const sequelize = require('./config/database');

async function migrate() {
  try {
    console.log('🔧 Starting polls database migration...\n');
    
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Drop existing polls tables if they exist
    console.log('📋 Dropping existing polls tables if they exist...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.query('DROP TABLE IF EXISTS poll_votes');
    await sequelize.query('DROP TABLE IF EXISTS polls');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Tables dropped\n');

    // Create polls table
    console.log('📋 Creating polls table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS polls (
        id INT NOT NULL AUTO_INCREMENT,
        forum_id INT NOT NULL,
        creator_id INT NOT NULL,
        question VARCHAR(255) NOT NULL,
        options JSON NOT NULL,
        expires_at DATETIME DEFAULT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_forum_id (forum_id),
        INDEX idx_creator_id (creator_id),
        INDEX idx_is_active (is_active),
        CONSTRAINT fk_polls_forum 
          FOREIGN KEY (forum_id) 
          REFERENCES forums (id) 
          ON DELETE CASCADE 
          ON UPDATE CASCADE,
        CONSTRAINT fk_polls_creator 
          FOREIGN KEY (creator_id) 
          REFERENCES users (id) 
          ON DELETE CASCADE 
          ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✅ polls table created\n');

    // Create poll_votes table
    console.log('📋 Creating poll_votes table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS poll_votes (
        id INT NOT NULL AUTO_INCREMENT,
        poll_id INT NOT NULL,
        user_id INT NOT NULL,
        option_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY idx_unique_user_poll_vote (poll_id, user_id),
        INDEX idx_poll_id (poll_id),
        INDEX idx_user_id (user_id),
        CONSTRAINT fk_poll_votes_poll 
          FOREIGN KEY (poll_id) 
          REFERENCES polls (id) 
          ON DELETE CASCADE 
          ON UPDATE CASCADE,
        CONSTRAINT fk_poll_votes_user 
          FOREIGN KEY (user_id) 
          REFERENCES users (id) 
          ON DELETE CASCADE 
          ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✅ poll_votes table created\n');

    // Verify tables
    console.log('🔍 Verifying tables...');
    const [pollsColumns] = await sequelize.query(`
      SHOW COLUMNS FROM polls
    `);
    console.log('polls columns:');
    pollsColumns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));

    const [votesColumns] = await sequelize.query(`
      SHOW COLUMNS FROM poll_votes
    `);
    console.log('\npoll_votes columns:');
    votesColumns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
