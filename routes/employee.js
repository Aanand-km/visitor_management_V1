const express = require('express');
const router = express.Router();

const db = require('../db/db');

router.get('/', (req, res) => {

    const sql = 'SELECT * FROM employees';

    db.query(sql, (err, result) => {

        if (err) {
            return res.status(500).json({
                message: 'Database Error'
            });
        }

        res.json(result);
    });

});

module.exports = router;