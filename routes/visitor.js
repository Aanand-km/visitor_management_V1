const express = require('express');
const router = express.Router();
const fs = require('fs');
const QRCode = require('qrcode');
const multer = require('multer');
const db = require('../db/db');
const {
    sendEmployeeNotification,
    sendVisitorPassEmail
} = require('../services/emailService');

const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        let uploadPath;

        if (file.fieldname === 'photo') {
            uploadPath = path.join(__dirname, '../uploads/photos');
        }

        else if (file.fieldname === 'document') {
            uploadPath = path.join(__dirname, '../uploads/documents');
        }

        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },

    filename: function (req, file, cb) {

        cb(
            null,
            Date.now() + '-' + file.originalname
        );

    }

});

const upload = multer({ storage });


console.log('Visitor routes loaded with file logging support');

router.post('/register', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'document', maxCount: 1 }]), (req, res) => {
    const {
        name,
        phone,
        email,
        document_type,
        document_number,
        purpose,
        employee_id,
        consent_given
    } = req.body;

    const photoPath = req.files?.photo ? `/uploads/photos/${req.files.photo[0].filename}` : null;
    const documentPath = req.files?.document ? `/uploads/documents/${req.files.document[0].filename}` : null;;

    console.log(req.body);
    console.log(req.files);
    console.log("Document Number:", document_number);

    fs.appendFileSync(
        './logs.txt',
        `\n${new Date().toISOString()} - ${JSON.stringify(req.body)}\n`
    );
    const approvalToken = crypto.randomBytes(32).toString('hex');
    const sql = `
INSERT INTO visitors
(
    name,
    phone,
    email,
    purpose,
    employee_id,
    photo_path,
    document_path,
    document_type,
    document_number,
    approval_token,
    status,
    consent_given
)
VALUES
(
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_security', ?
)
`;


    db.query(
        sql,
        [
            name,
            phone,
            email,
            purpose,
            employee_id,
            photoPath,
            documentPath,
            document_type,
            document_number,
            approvalToken,
            consent_given
        ], (err, result) => {

            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Database Error' });
            }
            const visitorId = result.insertId;
            /* const employeeSql = `
                                     SELECT email
                                     FROM employees
                                     WHERE id = ?
                                 `;
 
             db.query(employeeSql, [employee_id], async (err, employeeResult) => {
 
                 if (
                     !err &&
                     employeeResult.length > 0
                 ) {
 
                     try {
 
                         await sendEmployeeNotification(
 
                             employeeResult[0].email,
 
                             {
                                 id: visitorId,
                                 token: approvalToken,
                                 name,
                                 phone,
                                 email,
                                 purpose
                             }
                         );
 
                         console.log('Employee email sent');
 
                     } catch (mailError) {
 
                         console.error('Email Error:', mailError);
                     }
                 }
             }
             );*/
            res.json({
                message: 'Registration submitted successfully. Waiting for Security verification.',
                visitorId
            });
        }
    );
});


router.get('/pending/:employeeId', (req, res) => {
    const employeeId = req.params.employeeId;
    const sql = `
        SELECT
            visitors.id,
            visitors.name,
            visitors.phone,
            visitors.purpose,
            visitors.document_type,
            visitors.document_number,
            visitors.photo_path,
            visitors.document_path,
            visitors.created_at,
            employees.name AS employee_name
        FROM visitors
        LEFT JOIN employees
        ON visitors.employee_id = employees.id
        WHERE visitors.employee_id = ?
        AND visitors.status = 'pending_employee'
        ORDER BY visitors.created_at DESC
    `;

    db.query(sql, [employeeId], (err, result) => {
        if (err) {
            console.error("Error fetching pending visitors for employee:", err);
            return res.status(500).json({
                message: 'Database Error'
            });
        }
        res.json(result);
    });
});

router.put('/approve/:id', async (req, res) => {
    const visitorId = req.params.id;

    // Get visitor's current status and employee info
    const checkSql = `
        SELECT v.status, v.name, v.phone, v.email, v.purpose, v.approval_token, v.employee_id, e.email AS employee_email
        FROM visitors v
        LEFT JOIN employees e ON v.employee_id = e.id
        WHERE v.id = ?
    `;

    db.query(checkSql, [visitorId], async (err, checkResult) => {
        if (err) {
            console.error("Error checking visitor status:", err);
            return res.status(500).json({ message: 'Database Error' });
        }

        if (checkResult.length === 0) {
            return res.status(404).json({ message: 'Visitor not found' });
        }

        const visitor = checkResult[0];

        if (visitor.status === 'pending_security') {
            // Security verification: Update status to pending_employee
            const updateSql = `
                UPDATE visitors
                SET status = 'pending_employee'
                WHERE id = ?
            `;
            db.query(updateSql, [visitorId], async (updateErr) => {
                if (updateErr) {
                    console.error("Error updating status to pending_employee:", updateErr);
                    return res.status(500).json({ message: 'Database Error' });
                }

                // Send email notification to employee
                if (visitor.employee_email) {
                    try {
                        await sendEmployeeNotification(visitor.employee_email, {
                            id: visitorId,
                            token: visitor.approval_token,
                            name: visitor.name,
                            phone: visitor.phone,
                            email: visitor.email,
                            purpose: visitor.purpose
                        });
                        console.log('Employee email sent after security approval');
                    } catch (mailError) {
                        console.error('Email Notification Error:', mailError);
                    }
                }

                return res.json({
                    message: 'Verified by security, pending employee approval',
                    status: 'pending_employee'
                });
            });

        } else if (visitor.status === 'pending_employee') {
            // Employee approval: Transition status to approved, generate pass & QR
            const passId = 'PASS-' + Date.now();
            const qrText = `http://ducktail-five-prideful.ngrok-free.dev/visitor/scan/${visitorId}`;
            let qrCode;
            try {
                qrCode = await QRCode.toDataURL(qrText);
            } catch (qrErr) {
                console.error("QR Code Error:", qrErr);
                return res.status(500).json({ message: 'Error generating QR Code' });
            }

            const sql = `
                UPDATE visitors
                SET
                    status = 'approved',
                    pass_id = ?,
                    qr_code = ?,
                    approved_at = NOW()
                WHERE id = ?
            `;

            console.log("Approving Visitor (Final Employee Approval):", visitorId);
            console.log("Generated Pass:", passId);

            db.query(sql, [passId, qrCode, visitorId], async (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: 'Database Error' });
                }

                // Send pass email to visitor
                if (visitor.email) {
                    try {
                        await sendVisitorPassEmail(visitor.email, visitor.name, visitorId, passId);
                        console.log('Visitor pass email sent');
                    } catch (emailErr) {
                        console.error('Visitor pass email send error:', emailErr);
                    }
                }

                return res.json({
                    message: 'Visitor Approved',
                    visitorId,
                    passId
                });
            });

        } else {
            return res.status(400).json({
                message: `Visitor cannot be approved from status: ${visitor.status}`
            });
        }
    });
});

router.get('/approve-mail/:id', async (req, res) => {

    const visitorId = req.params.id;
    const token = req.query.token;

    db.query(
        `
        SELECT *
        FROM visitors
        WHERE id = ?
        AND approval_token = ?
        AND status = 'pending_security'
        `,
        [visitorId, token],
        async (err, rows) => {

            if (err) {
                return res.status(500).send(`
                <h1>Server Error</h1>
                `);
            }

            if (rows.length === 0) {

                return res.send(`
                <div style="font-family:Arial;text-align:center;margin-top:80px;">
                <h1>⚠ This approval link is no longer valid.</h1>

                <p>
                    The visitor has already been approved or rejected.
                </p>
                </div>
                `);
            }

            const passId = 'PASS-' + Date.now();

            const qrText = `https://visitor-management-jp03.onrender.com/visitor/scan/${visitorId}`;

            const qrCode = await QRCode.toDataURL(qrText);

            db.query(
                `
                UPDATE visitors
                SET
                    status='approved',
                    approval_token=NULL,
                    pass_id = ?,
                    qr_code = ?,
                    approved_at = NOW()
                WHERE id = ?
                `,
                [passId, qrCode, visitorId],
                async (err) => {

                    if (err) {
                        console.error(err);
                        return res.status(500).send('<h1>Database Error</h1>');
                    }

                    try {

                        await sendVisitorPassEmail(
                            rows[0].email,
                            rows[0].name,
                            visitorId,
                            passId
                        );

                    } catch (e) {

                        console.error(e);
                    }

                    res.redirect(`https://visitor-management-jp03.onrender.com/visitor-pass.html?id=${visitorId}`
                    );
                }
            );
        }
    );
});

router.get('/reject-mail/:id', (req, res) => {

    const visitorId = req.params.id;
    const token = req.query.token;

    db.query(
        `
        SELECT *
        FROM visitors
        WHERE id = ?
        AND approval_token = ?
        AND status = 'pending_security'
        `,
        [visitorId, token],
        (err, rows) => {

            if (err) {

                return res.status(500).send(`
        <h1>Server Error</h1>
    `);

            }

            if (rows.length === 0) {

                return res.send(`
        <div style="font-family:Arial;text-align:center;margin-top:80px;">

            <h1>⚠ This rejection link is no longer valid.</h1>

            <p>
                The visitor has already been approved or rejected.
            </p>

        </div>
    `);

            }

            db.query(
                `
                UPDATE visitors
                SET status = 'rejected',
                approval_token=NULL
                WHERE id = ?
                `,
                [visitorId]
            );

            res.send(`
                <h1>❌ Visitor Rejected</h1>
                <h2>${rows[0].name}</h2>
                <p>You may close this tab.</p>
            `);
        }
    );
});

router.get('/all', (req, res) => {
console.log("🔥 HIT /visitor/all");
    const sql = `
        SELECT
            visitors.id,
            visitors.name,
            visitors.phone,
            visitors.status,
            visitors.created_at,
            employees.name AS employee_name
        FROM visitors
        LEFT JOIN employees
        ON visitors.employee_id = employees.id
        ORDER BY visitors.created_at DESC
    `;

    db.query(sql, (err, result) => {

        if (err) {
    console.error("MYSQL ERROR:", err);

    return res.status(500).json({
        message: "Database Error",
        code: err.code,
        sqlMessage: err.sqlMessage,
        sql: err.sql
    });
}

        res.json(result);
    });
});

router.put('/reject/:id', (req, res) => {

    const visitorId = req.params.id;

    const sql = `
        UPDATE visitors
        SET status = 'rejected'
        WHERE id = ?
    `;

    db.query(sql, [visitorId], (err, result) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Database Error'
            });
        }

        res.json({
            message: 'Visitor Rejected'
        });
    });
});

router.get('/pass/:id', (req, res) => {

    const visitorId = req.params.id;

    const sql = `SELECT
    visitors.id,
    visitors.name,
    visitors.phone,
    visitors.document_type,
    visitors.document_number,
    visitors.status,
    visitors.pass_id,
    visitors.qr_code,
    visitors.photo_path,
    visitors.document_path,
    employees.name AS employee_name
FROM visitors
LEFT JOIN employees
ON visitors.employee_id = employees.id
WHERE visitors.id = ?`;

    db.query(
        sql,
        [visitorId],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    message: 'Database Error'
                });
            }

            res.json(result[0]);
        }
    );
});

router.get('/approved/count', (req, res) => {

    const sql = `
    SELECT COUNT(*) AS total
    FROM visitors
    WHERE DATE(approved_at) = CURDATE()
`;

    db.query(sql, (err, result) => {

        if (err) {
            return res.status(500).json({
                message: 'Database Error'
            });
        }

        res.json(result[0]);
    });

});



router.get('/scan/:id', (req, res) => {

    const visitorId = req.params.id;

    db.query(
        `
        SELECT
            name,
            status
        FROM visitors
        WHERE id = ?
        `,
        [visitorId],
        (err, result) => {

            if (err || result.length === 0) {
                return res.status(404).send('Visitor not found');
            }

            const visitor = result[0];

            if (visitor.status === 'approved') {

                db.query(
                    `
                    UPDATE visitors
                    SET
                        status = 'checked_in',
                        check_in_time = NOW()
                    WHERE id = ?
                    `,
                    [visitorId]
                );

                return res.send(`
                    <h1>✅ Check-In Successful</h1>
                    <h2>${visitor.name}</h2>
                `);
            }

            if (visitor.status === 'checked_in') {

                db.query(
                    `
                    UPDATE visitors
                    SET
                        status = 'checked_out',
                        check_out_time = NOW()
                    WHERE id = ?
                    `,
                    [visitorId]
                );

                return res.send(`
                    <h1>✅ Check-Out Successful</h1>
                    <h2>${visitor.name}</h2>
                `);
            }

            return res.send(`
                <h1>Visit Already Completed</h1>
                <h2>${visitor.name}</h2>
            `);
        }
    );
});





module.exports = router;