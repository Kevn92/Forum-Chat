// generate-hash.js
const bcrypt = require('bcrypt');

const password = 'admin123'; // Ganti dengan password yang diinginkan
const saltRounds = 10;

const hash = bcrypt.hashSync(password, saltRounds);
console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nCopy hash ini ke database.sql:');
console.log(hash);