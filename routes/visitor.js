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

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const jwt = require('jsonwebtoken');

function verifyEmployeeOrSecurityToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access Denied: No Token Provided' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Invalid or Expired Token' });
        if (decoded.role === 'security' || decoded.id) {
            req.user = decoded;
            next();
        } else {
            return res.status(403).json({ message: 'Unauthorized Access' });
        }
    });
}

function verifyEmployeeToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access Denied: No Token Provided' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err || !decoded.id) return res.status(403).json({ message: 'Invalid or Expired Token' });
        
        if (req.params.employeeId && parseInt(req.params.employeeId) !== decoded.id) {
            return res.status(403).json({ message: 'Unauthorized employee access' });
        }
        req.employee = decoded;
        next();
    });
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        let folder = 'visitor_management/others';
        if (file.fieldname === 'photo') {
            folder = 'visitor_management/photos';
        } else if (file.fieldname === 'document') {
            folder = 'visitor_management/documents';
        }
        return {
            folder: folder,
            allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
            resource_type: 'auto',
            public_id: Date.now() + '-' + path.parse(file.originalname).name
        };
    }
});

const upload = multer({ storage });


console.log('Visitor routes loaded with Cloudinary storage');

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

    const photoPath = req.files?.photo ? req.files.photo[0].path : null;
    const documentPath = req.files?.document ? req.files.document[0].path : null;

    console.log(req.body);
    console.log(req.files);
    console.log("Document Number:", document_number);

    fs.appendFileSync(
        './logs.txt',
        `\n${new Date().toISOString()} - ${JSON.stringify(req.body)}\n`
    );
    const approvalToken = crypto.randomBytes(32).toString('hex');
    const passToken = crypto.randomBytes(32).toString('hex');
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
    pass_token,
    status,
    consent_given
)
VALUES
(
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_security', ?
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
            passToken,
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


router.get('/pending/:employeeId', verifyEmployeeToken, (req, res) => {
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

router.put('/approve/:id', verifyEmployeeOrSecurityToken, async (req, res) => {
    const visitorId = req.params.id;

    // Get visitor's current status and employee info
    const checkSql = `
        SELECT v.status, v.name, v.phone, v.email, v.purpose, v.approval_token, v.pass_token, v.employee_id, e.email AS employee_email
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
            const qrText = `http://ducktail-five-prideful.ngrok-free.dev/visitor/scan/${visitorId}?token=${visitor.pass_token}`;
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
                    approval_token = NULL,
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
                        await sendVisitorPassEmail(visitor.email, visitor.name, visitorId, passId, visitor.pass_token);
                        console.log('Visitor pass email sent');
                    } catch (emailErr) {
                        console.error('Visitor pass email send error:', emailErr);
                    }
                }

                return res.json({
                    message: 'Visitor Approved',
                    visitorId,
                    passId,
                    passToken: visitor.pass_token
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
        AND status = 'pending_employee'
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

            const qrText = `https://visitor-management-jp03.onrender.com/visitor/scan/${visitorId}?token=${rows[0].pass_token}`;

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
                            passId,
                            rows[0].pass_token
                        );

                    } catch (e) {

                        console.error(e);
                    }

                    res.redirect(`/visitor-pass.html?id=${visitorId}&token=${rows[0].pass_token}`);
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
        AND status = 'pending_employee'
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

router.put('/reject/:id', verifyEmployeeOrSecurityToken, (req, res) => {
    const visitorId = req.params.id;

    const sql = `
        UPDATE visitors
        SET 
            status = 'rejected',
            approval_token = NULL
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
    const token = req.query.token;

    if (!token) {
        return res.status(403).json({ message: 'Access Denied: Missing Pass Token' });
    }

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
WHERE visitors.id = ? AND visitors.pass_token = ?`;

    db.query(
        sql,
        [visitorId, token],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    message: 'Database Error'
                });
            }

            if (result.length === 0) {
                return res.status(403).json({
                    message: 'Access Denied: Invalid Pass Token'
                });
            }

            res.json(result[0]);
        }
    );
});

router.get('/approved/count', verifyEmployeeOrSecurityToken, (req, res) => {

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
    const token = req.query.token;

    if (!token) {
        return res.status(403).send('Access Denied: Missing Pass Token');
    }

    db.query(
        `
        SELECT
            name,
            status
        FROM visitors
        WHERE id = ? AND pass_token = ?
        `,
        [visitorId, token],
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