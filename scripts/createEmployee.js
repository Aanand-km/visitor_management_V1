const bcrypt = require('bcryptjs');
const db = require('../db/db');

async function createEmployee() {

    const hashedPassword =
    await bcrypt.hash('123456',10);

    db.query(
        `
        UPDATE employees
        SET password = ?
        WHERE id = 3
        `,
        [hashedPassword],
        (err,result)=>{
            if(err) console.log(err);
            else console.log('Manish Password Added');
        }
    );
}

createEmployee();