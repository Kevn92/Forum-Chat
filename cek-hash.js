const bcrypt = require('bcrypt');

const password = 'admin123';
const hash = '$2b$10$tBbXw4tPKMm9/uRg1l5Hte4MzHLOd1kLsc0Was3I0kEBhMYPBS3eK';

const cocok = bcrypt.compareSync(password, hash);
console.log('Password cocok?', cocok); // Harus true