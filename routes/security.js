const express = require("express");
const router = express.Router();
const db = require("../db/db");

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
            console.error(err);

            return res.status(500).json({
                success: false,
                message: "Database Error"
            });
        }

        res.json({
            success: true,
            total: result.length,
            visitors: result
        });

    });

});

module.exports = router;