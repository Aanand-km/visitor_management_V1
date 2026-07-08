const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/db');

const router = express.Router();

router.post('/login',(req,res)=>{

    const {email,password} = req.body;

    db.query(
        'SELECT * FROM employees WHERE email=?',
        [email],
        async(err,results)=>{

            if(err){
                return res.status(500).json(err);
            }

            if(results.length===0){
                return res.status(401).json({
                    message:'Employee not found'
                });
            }

            const employee = results[0];

            const match =
            await bcrypt.compare(
                password,
                employee.password
            );

            if(!match){
                return res.status(401).json({
                    message:'Wrong Password'
                });
            }

            const token = jwt.sign(
                {
                    id: employee.id
                },
                process.env.JWT_SECRET,
                {
                    expiresIn:'1d'
                }
            );

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            });

            res.json({
                token,
                employee
            });

        }
    );

});

router.post('/signup', async (req, res) => {

    const {
        employeeId,
        email,
        password
    } = req.body;

    const sql = `
        SELECT *
        FROM employees
        WHERE id = ?
        AND email = ?
    `;

    db.query(
        sql,
        [employeeId, email],
        async (err, result) => {

            if (err) {
                console.error("Signup DB Error:", err);
                return res.status(500).json({
                    message: "Database Error"
                });
            }

            if (result.length === 0) {

                return res.status(404).json({
                    message:
                    'Employee not found'
                });

            }

            const employee =
                result[0];

            if(employee.password){

                return res.status(400).json({
                    message:
                    'Account already exists'
                });

            }

            const hash =
                await bcrypt.hash(
                    password,
                    10
                );

            db.query(
                `
                UPDATE employees
                SET password = ?
                WHERE id = ?
                `,
                [hash, employeeId],
                (err) => {

                    if(err){

                        return res.status(500).json({
                            message:
                            'Database Error'
                        });

                    }

                    res.json({
                        message:
                        'Account Created'
                    });

                }
            );

        }
    );

});

module.exports = router;