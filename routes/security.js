
const express = require("express");
const router = express.Router();
const db = require("../db/db");
const { verifyVisitorDocument } = require("../services/aiService");
console.log("✅ Security routes loaded");

/*
---------------------------------------------------------
Get All Visitors Waiting For Security Verification
GET /security/pending
---------------------------------------------------------
*/

router.get("/pending", (req, res) => {

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

router.get("/ai-verify/:id", (req, res) => {

    const visitorId = req.params.id;

    const sql = `
        SELECT
            document_path,
            document_type,
            document_number
        FROM visitors
        WHERE id=?
    `;

    db.query(sql, [visitorId], async (err, result) => {

        if (err) {

            console.error("AI Verification DB Error:", err);

            return res.status(500).json({
                message: "Database Error",
                error: err.message
            });

        }

        if (result.length === 0) {

            return res.status(404).json({
                message: "Visitor Not Found"
            });

        }

        try {

            const report =
                await verifyVisitorDocument(

                    result[0].document_path,

                    result[0].document_type,

                    result[0].document_number

                );

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

/*
---------------------------------------------------------
Reject Visitor from Security
PUT /security/reject/:id
---------------------------------------------------------
*/

router.put("/reject/:id", (req, res) => {

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

    db.query(sql, [reason || 'Not specified', visitorId], (err, result) => {

        if (err) {
            console.error('Rejection DB Error:', err);

            return res.status(500).json({
                success: false,
                message: "Database Error",
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Visitor Not Found"
            });
        }

        res.json({
            success: true,
            message: "Visitor rejected successfully",
            visitorId
        });

    });

});

module.exports = router;