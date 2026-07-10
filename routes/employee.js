const express = require('express');
const router = express.Router();

const db = require('../db/db');
const jwt = require('jsonwebtoken');

function verifyEmployeeToken(req, res, next) {

    const authHeader = req.headers["authorization"];

    const token =
        req.cookies.token ||
        (authHeader && authHeader.split(" ")[1]);

    if (!token) {

        return res.status(401).json({
            message: "Login Required"
        });

    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {

        if (err) {

            return res.status(403).json({
                message: "Invalid Token"
            });

        }

        req.employee = decoded;

        next();

    });

}
router.get('/', verifyEmployeeToken, (req, res) => {

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
router.get('/me', verifyEmployeeToken, (req, res) => {

    const sql = `
        SELECT
            id,
            name,
            email,
            department
        FROM employees
        WHERE id = ?
    `;

    db.query(sql, [req.employee.id], (err, result) => {

        if (err) {

            return res.status(500).json({
                message: "Database Error"
            });

        }

        if (result.length === 0) {

            return res.status(404).json({
                message: "Employee Not Found"
            });

        }

        res.json(result[0]);

    });

});
module.exports = router;