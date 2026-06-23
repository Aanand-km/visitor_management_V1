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

        const uploadPath = path.join(__dirname, '../uploads/photos');

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

const upload = multer({
    storage: storage
});

console.log('Visitor routes loaded with file logging support');

router.post('/register', upload.single('photo'), (req, res) => {
    const {
        name,
        phone,
        email,
        aadhaar_number,
        purpose,
        employee_id
    } = req.body;
    const photo_data =
        req.file
            ? fs.readFileSync(req.file.path, {
                encoding: 'base64'
            })
            : null;
    console.log(req.body);
    console.log("Aadhaar:", aadhaar_number);
    fs.appendFileSync('./logs.txt', `\n${new Date().toISOString()} - req.body: ${JSON.stringify(req.body)}\nAadhaar: ${aadhaar_number}\n`);
    const approvalToken =
        crypto.randomBytes(32).toString('hex');
    const sql = `
        INSERT INTO visitors
        (name, phone, email, aadhaar_number, purpose, employee_id, photo_data,  approval_token,status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?,'pending')
    `;

    db.query(

        sql,
        [name, phone, email, aadhaar_number, purpose, employee_id, photo_data, approvalToken],
        (err, result) => {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: 'Database Error'
                });
            }
            const visitorId = result.insertId;
            const employeeSql = `
                                    SELECT email
                                    FROM employees
                                    WHERE id = ?
                                `;

            db.query(
                employeeSql,
                [employee_id],
                async (err, employeeResult) => {

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

                            console.log(
                                'Employee email sent'
                            );

                        } catch (mailError) {

                            console.error(
                                'Email Error:',
                                mailError
                            );
                        }
                    }
                }
            );
            res.json({
                message: 'Visitor Registered Successfully',
                visitorId: result.insertId,
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
            employees.name AS employee_name
        FROM visitors
        LEFT JOIN employees
        ON visitors.employee_id = employees.id
        WHERE visitors.status = 'pending'
        AND visitors.employee_id = ?
    `;

    db.query(
        sql,
        [employeeId],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    message: 'Database Error'
                });
            }

            res.json(result);
        }
    );
});

router.put('/approve/:id', async (req, res) => {

    const visitorId = req.params.id;

    const passId =
        'PASS-' + Date.now();

    const qrText =
        `http://ducktail-five-prideful.ngrok-free.dev/visitor/scan/${visitorId}`;

    const qrCode =
        await QRCode.toDataURL(qrText);

    const sql = `
    UPDATE visitors
    SET
        status = 'approved',
        pass_id = ?,
        qr_code = ?,
        approved_at = NOW()
    WHERE id = ?
`;
    console.log("Approving Visitor:", visitorId);
    console.log("Generated Pass:", passId);
    db.query(
        sql,
        [passId, qrCode, visitorId],
        (err, result) => {
            console.log("DB Result:", result);
            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: 'Database Error'
                });
            }
            const visitorSql = `
SELECT
    name,
    email
FROM visitors
WHERE id = ?
`;

            db.query(
                visitorSql,
                [visitorId],
                async (err, visitorResult) => {

                    if (
                        !err &&
                        visitorResult.length > 0
                    ) {

                        try {

                            await sendVisitorPassEmail(visitorResult[0].email, visitorResult[0].name, visitorId, passId);

                            console.log('Visitor pass email sent');

                        } catch (emailErr) {

                            console.error(emailErr);
                        }
                    }
                }
            );
            res.json({
                message: 'Visitor Approved',
                visitorId,
                passId
            });
        }
    );
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
        `,
        [visitorId, token],
        async (err, rows) => {

            if (err || rows.length === 0) {
                return res
                    .status(403)
                    .send('<h1>❌ Invalid Approval Link</h1>');
            }

            const passId =
                'PASS-' + Date.now();

            const qrText =
                `https://visitor-management-jp03.onrender.com/visitor/scan/${visitorId}`;

            const qrCode =
                await QRCode.toDataURL(qrText);

            db.query(
                `
                UPDATE visitors
                SET
                    status = 'approved',
                    pass_id = ?,
                    qr_code = ?,
                    approved_at = NOW()
                WHERE id = ?
                `,
                [passId, qrCode, visitorId],
                async (err) => {

                    if (err) {
                        console.error(err);
                        return res
                            .status(500)
                            .send('<h1>Database Error</h1>');
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

                    res.redirect(
    `https://visitor-management-jp03.onrender.com/visitor-pass.html?id=${visitorId}`
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
        `,
        [visitorId, token],
        (err, rows) => {

            if (err || rows.length === 0) {
                return res
                    .status(403)
                    .send('<h1>❌ Invalid Rejection Link</h1>');
            }

            db.query(
                `
                UPDATE visitors
                SET status = 'rejected'
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
            return res.status(500).json({
                message: 'Database Error'
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

    const sql = `
        SELECT
            visitors.id,
            visitors.name,
            visitors.phone,
            visitors.aadhaar_number,
            visitors.status,
            visitors.pass_id,
            visitors.qr_code,
            visitors.photo_data,
            employees.name AS employee_name
        FROM visitors
        LEFT JOIN employees
        ON visitors.employee_id = employees.id
        WHERE visitors.id = ?
    `;

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



router.get('/change-email', (req, res) => {

    const employeeId = 3; // change employee ID
    const newEmail = 'anandkm539@gmail.com';

    db.query(
        `
        UPDATE employees
        SET email = ?
        WHERE id = ?
        `,
        [newEmail, employeeId],
        (err, result) => {

            if (err) {
                console.error(err);
                return res.send(err.message);
            }

            res.send('Employee email updated');
        }
    );

});

module.exports = router;