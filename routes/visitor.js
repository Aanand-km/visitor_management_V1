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

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(null, './uploads/photos');
    },

    filename: function (req, file, cb) {

        cb(
            null,
            Date.now() +
            '-' +
            file.originalname
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
    const photo_path =
        req.file
            ? req.file.path
            : null;
    console.log(req.body);
    console.log("Aadhaar:", aadhaar_number);
    fs.appendFileSync('./logs.txt', `\n${new Date().toISOString()} - req.body: ${JSON.stringify(req.body)}\nAadhaar: ${aadhaar_number}\n`);

    const sql = `
        INSERT INTO visitors
        (name, phone, email, aadhaar_number, purpose, employee_id, photo_path, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

    db.query(

        sql,
        [name, phone, email, aadhaar_number, purpose, employee_id, photo_path],
        (err, result) => {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: 'Database Error'
                });
            }
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
                visitorId: result.insertId
            });
        }
    );
});

router.get('/pending', (req, res) => {

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

router.put('/approve/:id', async (req, res) => {

    const visitorId = req.params.id;

    const passId =
        'PASS-' + Date.now();

    const qrText =
        `Visitor ID: ${visitorId}
Pass ID: ${passId}`;

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

                            await sendVisitorPassEmail(visitorResult[0].email,visitorResult[0].name,visitorId,passId);

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
            visitors.photo_path,
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

module.exports = router;