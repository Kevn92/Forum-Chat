const sequelize = require('./config/database');

async function fixDuplicateKeys() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    
    console.log('Fetching indexes for "users" table...');
    const [results] = await sequelize.query(`SHOW INDEX FROM users WHERE Column_name = 'username'`);
    
    const indexes = results.map(row => row.Key_name).filter(name => name !== 'PRIMARY');
    
    if (indexes.length > 1) {
      console.log(`Found ${indexes.length} indexes on username. Keeping one and dropping the rest...`);
      // Keep the first one, drop the rest
      const toDrop = indexes.slice(1);
      
      for (const indexName of toDrop) {
        console.log(`Dropping index: ${indexName}`);
        await sequelize.query(`ALTER TABLE users DROP INDEX \`${indexName}\``);
      }
      console.log('✅ Successfully removed duplicate keys!');
    } else {
      console.log('✅ No duplicate keys found.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing keys:', error);
    process.exit(1);
  }
}

fixDuplicateKeys();
