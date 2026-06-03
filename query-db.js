const db = require('./db/db');

db.query('SELECT * FROM visitors ORDER BY id DESC LIMIT 1', (err, result) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Latest Visitor:');
        console.log(JSON.stringify(result, null, 2));
    }
    process.exit();
});
