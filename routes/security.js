const path= require("path")
const express = require("express");
const router = express.Router();
const db = require("../db/db");
const { verifyVisitorDocument } = require("../services/aiService");
const { sendVisitorRejectionEmail } = require("../services/emailService");
const jwt = require("jsonwebtoken");

console.log("✅ Security routes loaded");

const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Middleware to verify security token
function verifySecurityToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = req.cookies.securityToken || (authHeader && authHeader.split(' ')[1]);
    const refreshToken = req.cookies.securityRefreshToken;

    const handleRefresh = () => {
        if (!refreshToken) {
            return res.status(401).json({ message: 'Access Denied: Session Expired. Please login again.' });
        }
        jwt.verify(refreshToken, process.env.JWT_SECRET, (refErr, refDecoded) => {
            if (refErr || refDecoded.role !== 'security') {
                return res.status(403).json({ message: 'Session Expired: Please Login Again' });
            }
            const newToken = jwt.sign({ role: 'security' }, process.env.JWT_SECRET, { expiresIn: '15m' });
            res.cookie("securityToken", newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000
            });
            req.securityUser = refDecoded;
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
            return res.status(403).json({ message: 'Invalid or Expired Token' });
        }
        if (decoded.role !== 'security') {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        req.securityUser = decoded;
        next();
    });
}
/*
---------------------------------------------------------
Security Dashboard
---------------------------------------------------------
*/

router.get("/dashboard", (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = req.cookies.securityToken || (authHeader && authHeader.split(' ')[1]);
    
    if (!token) {
        return res.redirect("/security-login.html");
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err || decoded.role !== 'security') {
            return res.redirect("/security-login.html");
        }
        req.securityUser = decoded;
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.sendFile(
            path.join(__dirname, "../views/security-dashboard.html")
        );
    });
});
/*
---------------------------------------------------------
Security Guard Login
POST /security/login
---------------------------------------------------------
*/
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const expectedUser = process.env.SECURITY_USER || 'security';
    const expectedPass = process.env.SECURITY_PASS || 'Security@123';

    if (username === expectedUser && password === expectedPass) {
        const token = jwt.sign({ role: 'security' }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ role: 'security', isRefreshToken: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        res.cookie("securityToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 mins
        });
        
        res.cookie("securityRefreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Username or Password' });
    }
});
/*
---------------------------------------------------------
Check Security Authentication
GET /security/check-auth
---------------------------------------------------------
*/

router.get("/check-auth", verifySecurityToken, (req, res) => {

    res.json({
        authenticated: true,
        user: req.securityUser
    });

});
/*
---------------------------------------------------------
Logout Security
POST /security/logout
---------------------------------------------------------
*/

router.post("/logout", (req, res) => {

    res.clearCookie("securityToken", {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production"
    });
    res.clearCookie("securityRefreshToken", {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production"
    });

    res.json({
        success: true
    });

});
/*
---------------------------------------------------------
Get All Visitors Waiting For Security Verification
GET /security/pending
---------------------------------------------------------
*/

router.get("/pending", verifySecurityToken, (req, res) => {

    const sql = `
        SELECT
            visitors.id,
            visitors.name,
            visitors.phone,
            visitors.email,
            visitors.purpose,
            visitors.document_type,
            visitors.document_number,
            visitors.document_path,
            visitors.created_at,
            visitors.employee_name_input,
            visitors.department_input,
            visitors.status,
            visitors.employee_id,
            employees.name AS employee_name
        FROM visitors
        LEFT JOIN employees
            ON visitors.employee_id = employees.id
        WHERE visitors.status = 'pending_security'
        ORDER BY visitors.created_at DESC
    `;

    db.query(sql, (err, result) => {

        if (err) {
            console.error('Security/Pending DB Error:', err);

            return res.status(500).json({
                success: false,
                message: "Database Error",
                error: err.message
            });
        }

        res.json({
            success: true,
            total: result.length,
            visitors: result
        });

    });

});

router.get("/ai-verify/:id", verifySecurityToken, asyncHandler(async (req, res) => {

    const visitorId = req.params.id;

    const sql = `
        SELECT
            document_path,
            document_type,
            document_number,
            employee_name_input,
            department_input
        FROM visitors
        WHERE id=?
    `;

    db.query(sql, [visitorId], (err, result) => {

        if (err) {

            console.error("========== DATABASE ERROR ==========");
            console.error(err);

            return res.status(500).json({
                message: "Database Error",
                error: err.message,
                code: err.code,
                sql: err.sql
            });

        }

        if (result.length === 0) {

            return res.status(404).json({
                message: "Visitor Not Found"
            });

        }

        const visitor = result[0];

        // Fetch employee list for AI context matching
        db.query('SELECT id, name, department, email FROM employees', async (empErr, empList) => {
            if (empErr) {
                console.error("Employee Query Error:", empErr);
                return res.status(500).json({ message: "Database Error" });
            }

            try {

                const report =
                    await verifyVisitorDocument(
                        visitor.document_path,
                        visitor.document_type,
                        visitor.document_number,
                        visitor.employee_name_input,
                        visitor.department_input,
                        empList
                    );

                // Auto-link the visitor to resolved employee_id in database if match found
                if (report.matchedEmployeeId) {
                    db.query(
                        'UPDATE visitors SET employee_id = ? WHERE id = ?',
                        [report.matchedEmployeeId, visitorId],
                        (updateErr) => {
                            if (updateErr) console.error("Error auto-linking visitor to employee:", updateErr);
                        }
                    );
                }

                res.json(report);

            }

            catch (error) {

                console.error("========== AI ERROR ==========");
                console.error(error);
                console.error(error.stack);

                res.status(500).json({
                    message: "AI Verification Failed",
                    error: error.message
                });

            }
        });

    });

}));

/*
---------------------------------------------------------
Reject Visitor from Security
PUT /security/reject/:id
---------------------------------------------------------
*/

router.put("/reject/:id", verifySecurityToken, (req, res) => {

    const visitorId = req.params.id;
    const reason = 'Rejected by security';

    const sql = `
        UPDATE visitors
        SET
            status = 'rejected',
            rejection_reason = ?,
            rejected_at = NOW()
        WHERE id = ?
    `;

    const getVisitorSql = 'SELECT name, email FROM visitors WHERE id = ?';
    db.query(getVisitorSql, [visitorId], (getErr, getRes) => {
        if (getErr || getRes.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Visitor Not Found"
            });
        }

        const visitor = getRes[0];

        db.query(sql, [reason, visitorId], (err, result) => {

            if (err) {
                console.error('Rejection DB Error:', err);

                return res.status(500).json({
                    success: false,
                    message: "Database Error",
                    error: err.message
                });
            }

            sendVisitorRejectionEmail(visitor.email, visitor.name, reason)
                .catch(mailErr => console.error("Error sending rejection email:", mailErr));

            res.json({
                success: true,
                message: "Visitor rejected successfully",
                visitorId
            });

        });
    });

});

module.exports = router;