const db = require('./db/db');

db.query('SHOW TABLES', (err, result) => {
    if (err) {
        console.error(err);
    } else {
        console.log(result);
    }
    process.exit();
});