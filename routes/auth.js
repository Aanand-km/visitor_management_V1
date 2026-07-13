const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/db');
const path = require("path");
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
                { id: employee.id },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );
            const refreshToken = jwt.sign(
                { id: employee.id, isRefreshToken: true },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.cookie('employeeToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000 // 15 mins
            });

            res.cookie('employeeRefreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({
    success: true,
    employee: {
        id: employee.id,
        name: employee.name
    }
});

        }
    );

});
function verifyEmployeeToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = req.cookies.employeeToken || (authHeader && authHeader.split(" ")[1]);
    const refreshToken = req.cookies.employeeRefreshToken;

    const handleRefresh = () => {
        if (!refreshToken) {
            return res.status(401).json({ message: "Login Required (Session Expired)" });
        }
        jwt.verify(refreshToken, process.env.JWT_SECRET, (refErr, refDecoded) => {
            if (refErr || !refDecoded.id) {
                return res.status(403).json({ message: "Invalid or Expired Session" });
            }
            const newToken = jwt.sign({ id: refDecoded.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
            res.cookie('employeeToken', newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000
            });
            req.employee = refDecoded;
            next();
        });
    };

    if (!token) {
        return handleRefresh();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return handleRefresh();
            }
            return res.status(403).json({ message: "Invalid Token" });
        }
        req.employee = decoded;
        next();
    });
}
router.get("/check-auth", verifyEmployeeToken, (req, res) => {

    res.json({
        authenticated: true
    });

});
router.post("/logout", (req, res) => {

    res.clearCookie("employeeToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    });
    res.clearCookie("employeeRefreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    });

    res.json({
        success: true
    });

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


router.get("/dashboard", (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = req.cookies.employeeToken || (authHeader && authHeader.split(' ')[1]);
    
    if (!token) {
        return res.redirect("/employee-login.html");
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err || !decoded.id) {
            return res.redirect("/employee-login.html");
        }
        req.employee = decoded;
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.sendFile(
            path.join(__dirname, "../views/employee-dashboard.html")
        );
    });
});

module.exports = router;