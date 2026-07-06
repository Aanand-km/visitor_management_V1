
const express = require("express");
const router = express.Router();
const db = require("../db/db");
const { verifyVisitorDocument } = require("../services/aiService");
const { sendVisitorRejectionEmail } = require("../services/emailService");
const jwt = require("jsonwebtoken");

console.log("✅ Security routes loaded");

// Middleware to verify security token
function verifySecurityToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Access Denied: No Token Provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err || decoded.role !== 'security') {
            return res.status(403).json({ message: 'Invalid or Expired Token' });
        }
        req.securityUser = decoded;
        next();
    });
}

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
        const token = jwt.sign({ role: 'security' }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Username or Password' });
    }
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

router.get("/ai-verify/:id", verifySecurityToken, (req, res) => {

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

                // If AI resolves a high-confidence match (>= 70%), save to database
                if (report.matchedEmployee && report.matchedEmployee.id && report.matchedEmployee.confidence >= 70) {
                    db.query(
                        'UPDATE visitors SET employee_id = ? WHERE id = ?',
                        [report.matchedEmployee.id, visitorId],
                        (updateErr) => {
                            if (updateErr) {
                                console.error("Error updating matched employee_id:", updateErr);
                            } else {
                                console.log(`Linked visitor ID ${visitorId} to employee ID ${report.matchedEmployee.id}`);
                            }
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

});

/*
---------------------------------------------------------
Reject Visitor from Security
PUT /security/reject/:id
---------------------------------------------------------
*/

router.put("/reject/:id", verifySecurityToken, (req, res) => {

    const visitorId = req.params.id;
    const { reason } = req.body;

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

        db.query(sql, [reason || 'Not specified', visitorId], (err, result) => {

            if (err) {
                console.error('Rejection DB Error:', err);

                return res.status(500).json({
                    success: false,
                    message: "Database Error",
                    error: err.message
                });
            }

            sendVisitorRejectionEmail(visitor.email, visitor.name, reason || 'Not specified')
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