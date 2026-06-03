const db = require('./db/db');

setTimeout(() => {
  db.query('SELECT id, name, aadhaar_number, status FROM visitors ORDER BY id DESC LIMIT 3', (err, result) => {
      if (err) {
          console.error('Error:', err);
      } else {
          console.log('\n=== Latest Visitors ===');
          result.forEach((row, index) => {
              console.log(`\n${index + 1}. ID: ${row.id}`);
              console.log(`   Name: ${row.name}`);
              console.log(`   Aadhaar: ${row.aadhaar_number || 'NULL'}`);
              console.log(`   Status: ${row.status}`);
          });
      }
      process.exit();
  });
}, 1000);
