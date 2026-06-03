const express = require('express');
const router = express.Router();
const db = require('../db/db');

router.post('/send', (req, res) => {

    const { phone } = req.body;

    const otp =
        Math.floor(
            100000 + Math.random() * 900000
        ).toString();

    const sql = `
        INSERT INTO otp_verifications
        (phone, otp, expires_at)
        VALUES
        (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))
    `;

    db.query(
        sql,
        [phone, otp],
        (err, result) => {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: 'Database Error'
                });
            }

            console.log(
                'Generated OTP:',
                otp
            );

            res.json({
                message: 'OTP Sent'
            });
        }
    );
});
router.get('/test', (req, res) => {

    const otp =
        Math.floor(
            100000 + Math.random() * 900000
        );

    console.log(
        'Generated OTP:',
        otp
    );

    res.send(
        `OTP Generated: ${otp}`
    );

});

router.post('/verify', (req, res) => {

    const { phone, otp } = req.body;

    const sql = `
        SELECT *
        FROM otp_verifications
        WHERE phone = ?
        AND otp = ?
        AND expires_at > NOW()
        ORDER BY id DESC
        LIMIT 1
    `;

    db.query(
        sql,
        [phone, otp],
        (err, result) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    verified: false
                });
            }

            if (result.length > 0) {

                return res.json({
                    verified: true
                });
            }

            res.json({
                verified: false
            });
        }
    );

});

module.exports = router;