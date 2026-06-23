const db = require('./db/db');

db.query(
    `
    ALTER TABLE visitors
    ADD COLUMN approval_token VARCHAR(255)
    `,
    (err, result) => {
        if (err) {
            console.log(err);
        } else {
            console.log("approval_token added");
        }
        process.exit();
    }
);