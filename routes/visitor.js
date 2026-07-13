const express = require('express');
const router = express.Router();
const fs = require('fs');
const QRCode = require('qrcode');
const multer = require('multer');
const db = require('../db/db');
const {
    sendEmployeeNotification,
    sendVisitorPassEmail,
    sendVisitorRejectionEmail,
    sendSecurityNotification
} = require('../services/emailService');

const path = require('path');
const crypto = require('crypto');
const Joi = require('joi');

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const jwt = require('jsonwebtoken');
const { matchEmployeeWithAI } = require('../services/aiService');

function verifyEmployeeOrSecurityToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const securityToken = req.cookies.securityToken;
    const employeeToken = req.cookies.employeeToken;
    const bearerToken = authHeader && authHeader.split(" ")[1];
    
    const securityRefreshToken = req.cookies.securityRefreshToken;
    const employeeRefreshToken = req.cookies.employeeRefreshToken;

    const trySecurityRefresh = () => {
        if (!securityRefreshToken) return tryEmployeeRefresh();
        jwt.verify(securityRefreshToken, process.env.JWT_SECRET, (refErr, refDecoded) => {
            if (refErr || refDecoded.role !== 'security') return tryEmployeeRefresh();
            const newToken = jwt.sign({ role: 'security' }, process.env.JWT_SECRET, { expiresIn: '15m' });
            res.cookie("securityToken", newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000
            });
            req.user = refDecoded;
            next();
        });
    };

    const tryEmployeeRefresh = () => {
        if (!employeeRefreshToken) {
            return res.status(401).json({ message: 'Access Denied: No Token Provided' });
        }
        jwt.verify(employeeRefreshToken, process.env.JWT_SECRET, (refErr, refDecoded) => {
            if (refErr || !refDecoded.id) {
                return res.status(401).json({ message: 'Access Denied: Session Expired' });
            }
            const newToken = jwt.sign({ id: refDecoded.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
            res.cookie('employeeToken', newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000
            });
            req.user = refDecoded;
            next();
        });
    };

    if (securityToken) {
        jwt.verify(securityToken, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                if (err.name === 'TokenExpiredError') return trySecurityRefresh();
                return tryEmployeeRefresh();
            }
            req.user = decoded;
            next();
        });
    } else if (employeeToken) {
        jwt.verify(employeeToken, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                if (err.name === 'TokenExpiredError') return tryEmployeeRefresh();
                return trySecurityRefresh();
            }
            req.user = decoded;
            next();
        });
    } else if (bearerToken) {
        jwt.verify(bearerToken, process.env.JWT_SECRET, (err, decoded) => {
            if (err) return res.status(403).json({ message: 'Invalid Token' });
            req.user = decoded;
            next();
        });
    } else {
        trySecurityRefresh();
    }
}

function verifyEmployeeToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = req.cookies.employeeToken || (authHeader && authHeader.split(" ")[1]);
    const refreshToken = req.cookies.employeeRefreshToken;

    const handleRefresh = () => {
        if (!refreshToken) {
            return res.status(401).json({ message: 'Access Denied: Session Expired' });
        }
        jwt.verify(refreshToken, process.env.JWT_SECRET, (refErr, refDecoded) => {
            if (refErr || !refDecoded.id) {
                return res.status(403).json({ message: 'Session Expired' });
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
            if (err.name === 'TokenExpiredError') return handleRefresh();
            return res.status(403).json({ message: 'Invalid Token' });
        }
        if (req.params.employeeId && parseInt(req.params.employeeId) !== decoded.id) {
            return res.status(403).json({ message: 'Unauthorized employee access' });
        }
        req.employee = decoded;
        next();
    });
}

const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

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
            type: 'authenticated',
            allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
            resource_type: 'auto',
            public_id: Date.now() + '-' + path.parse(file.originalname).name
        };
    }
});

const upload = multer({ storage });


console.log('Visitor routes loaded with Cloudinary storage');

router.post('/register', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'document', maxCount: 1 }]), (req, res) => {
    const registerSchema = Joi.object({
        name: Joi.string().min(2).max(100).required(),
        phone: Joi.string().pattern(/^[0-9+ ]{10,18}$/).required(),
        email: Joi.string().email().required(),
        document_type: Joi.string().required(),
        document_number: Joi.string().required(),
        purpose: Joi.string().max(255).required(),
        employee_name_input: Joi.string().min(2).max(100).required(),
        department_input: Joi.string().required(),
        consent_given: Joi.any().required()
    });

    const { error } = registerSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            message: 'Validation Error',
            details: error.details.map(d => d.message).join(', ')
        });
    }

    const {
        name,
        phone,
        email,
        document_type,
        document_number,
        purpose,
        employee_name_input,
        department_input,
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
    employee_name_input,
    department_input,
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
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_security', ?
)
`;


    db.query(
        sql,
        [
            name,
            phone,
            email,
            purpose,
            employee_name_input,
            department_input,
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

            // Notify security team
            const securityEmail = process.env.SECURITY_EMAIL;
            if (securityEmail) {
                sendSecurityNotification(securityEmail, {
                    name,
                    phone,
                    email,
                    purpose,
                    employee_name_input,
                    department_input,
                    document_type,
                    document_number
                }).catch(mailErr => {
                    console.error("Failed to send security notification email:", mailErr);
                });
            }

            // Asynchronously resolve employee matching in background to prevent delay
            const exactSql = "SELECT id FROM employees WHERE LOWER(name) = LOWER(?) AND LOWER(department) = LOWER(?)";
            db.query(exactSql, [
                employee_name_input ? employee_name_input.trim() : '',
                department_input ? department_input.trim() : ''
            ], (exactErr, exactRows) => {
                if (!exactErr && exactRows.length > 0) {
                    // Exact name and department match! Update immediately.
                    db.query(
                        'UPDATE visitors SET employee_id = ? WHERE id = ?',
                        [exactRows[0].id, visitorId],
                        (updateErr) => {
                            if (!updateErr) {
                                console.log(`Linked visitor ID ${visitorId} directly (exact name & dept match) to employee ID ${exactRows[0].id}`);
                            }
                        }
                    );
                } else if (employee_name_input) {
                    // Fallback to Gemini matching in the background
                    db.query('SELECT id, name, department, email FROM employees', async (empErr, empList) => {
                        if (!empErr && empList.length > 0) {
                            try {
                                const matched = await matchEmployeeWithAI(`${employee_name_input} (Dept: ${department_input})`, empList);
                                if (matched && matched.id && matched.confidence >= 70) {
                                    db.query(
                                        'UPDATE visitors SET employee_id = ? WHERE id = ?',
                                        [matched.id, visitorId],
                                        (updateErr) => {
                                            if (!updateErr) {
                                                console.log(`Linked visitor ID ${visitorId} via background AI to employee ID ${matched.id}`);
                                            }
                                        }
                                    );
                                }
                            } catch (aiErr) {
                                console.error("Background AI match execution error:", aiErr);
                            }
                        }
                    });
                }
            });

            res.json({
                message: 'Registration submitted successfully. Waiting for Security verification.',
                visitorId
            });
        }
    );
});


router.get('/pending', verifyEmployeeToken, (req, res) => {

    const employeeId = req.employee.id;

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
            console.error("Error fetching pending visitors:", err);

            return res.status(500).json({
                message: "Database Error"
            });
        }

        res.json(result);

    });

});
router.put('/approve/:id', verifyEmployeeOrSecurityToken, asyncHandler(async (req, res) => {
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
                        console.error('Mail Error:', mailError);
                    }
                }

                return res.json({ message: 'Approved by Security. Employee Approval Pending.' });
            });

        } else if (visitor.status === 'pending_employee') {
            // Employee verification: Approve visitor (Final Approval)
            const passId = 'PASS-' + Date.now();
            const qrText = `https://visitor-management-jp03.onrender.com/visitor-pass.html?id=${visitorId}&token=${visitor.pass_token}`;
            const qrCode = await QRCode.toDataURL(qrText);

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
                        await sendVisitorPassEmail(visitor.email, visitor.name, visitorId, passId, visitor.pass_token, 'Approved by security and employee');
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
}));

router.get('/approve-mail/:id', asyncHandler(async (req, res) => {

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

            const qrText = `https://visitor-management-jp03.onrender.com/visitor-pass.html?id=${visitorId}&token=${rows[0].pass_token}`;

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
                            rows[0].pass_token,
                            'Approved by security and employee'
                        );

                    } catch (e) {

                        console.error(e);
                    }

                    res.redirect(`/visitor-pass.html?id=${visitorId}&token=${rows[0].pass_token}`);
                }
            );
        }
    );
}));

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

            const reason = 'Approved by security but rejected by employee';
            db.query(
                `
                UPDATE visitors
                SET 
                    status = 'rejected',
                    rejection_reason = ?,
                    rejected_at = NOW(),
                    approval_token = NULL
                WHERE id = ?
                `,
                [reason, visitorId],
                (updateErr) => {
                    if (updateErr) {
                        console.error("DB update error in reject-mail:", updateErr);
                    } else {
                        sendVisitorRejectionEmail(rows[0].email, rows[0].name, reason)
                            .catch(mailErr => console.error("Error sending rejection email:", mailErr));
                    }
                }
            );

            res.send(`
                <h1>❌ Visitor Rejected</h1>
                <h2>${rows[0].name}</h2>
                <p>You may close this tab.</p>
            `);
        }
    );
});

router.get('/all', verifyEmployeeOrSecurityToken, (req, res) => {
console.log("🔥 HIT /visitor/all");
    const sql = `
        SELECT
            visitors.id,
            visitors.name,
            visitors.phone,
            visitors.status,
            visitors.created_at,
            visitors.check_in_time,
            visitors.check_out_time,
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

    // Fetch visitor details first to know the current status and get name/email
    const getVisitorSql = 'SELECT name, email, status FROM visitors WHERE id = ?';
    db.query(getVisitorSql, [visitorId], (getErr, getRes) => {
        if (getErr || getRes.length === 0) {
            console.error("Error finding visitor for rejection:", getErr);
            return res.status(500).json({
                message: getErr ? 'Database Error' : 'Visitor not found' 
            });
        }

        const visitor = getRes[0];
        
        // Determine the rejection reason based on current status
        const reason = visitor.status === 'pending_security' 
            ? 'Rejected by security' 
            : 'Approved by security but rejected by employee';

        const sql = `
            UPDATE visitors
            SET 
                status = 'rejected',
                rejection_reason = ?,
                rejected_at = NOW(),
                approval_token = NULL
            WHERE id = ?
        `;

        db.query(sql, [reason, visitorId], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: 'Database Error'
                });
            }

            // Send rejection email using the fetched details and correct reason
            sendVisitorRejectionEmail(visitor.email, visitor.name, reason)
                .catch(mailErr => console.error("Error sending rejection email:", mailErr));

            res.json({
                message: 'Visitor Rejected'
            });
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



router.post('/check-in-out', verifyEmployeeOrSecurityToken, (req, res) => {
    const { id, token } = req.body;

    if (!id || !token) {
        return res.status(400).send('<h1>Missing parameters</h1>');
    }

    db.query(
        `
        SELECT
            name,
            status
        FROM visitors
        WHERE id = ? AND pass_token = ?
        `,
        [id, token],
        (err, result) => {

            if (err || result.length === 0) {
                return res.status(404).send('<h1>Visitor not found or invalid pass</h1>');
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
                    [id],
                    (updateErr) => {
                        if (updateErr) {
                            return res.status(500).send('<h1>Database Error</h1>');
                        }
                        return res.send(`
                            <h1 style="color: #16a34a; font-size: 2rem;">✅ Check-In Successful</h1>
                            <h2 style="font-size: 1.5rem; margin-top: 10px; color: #1f2937;">${visitor.name}</h2>
                        `);
                    }
                );
            } else if (visitor.status === 'checked_in') {

                db.query(
                    `
                    UPDATE visitors
                    SET
                        status = 'checked_out',
                        check_out_time = NOW()
                    WHERE id = ?
                    `,
                    [id],
                    (updateErr) => {
                        if (updateErr) {
                            return res.status(500).send('<h1>Database Error</h1>');
                        }
                        return res.send(`
                            <h1 style="color: #2563eb; font-size: 2rem;">✅ Check-Out Successful</h1>
                            <h2 style="font-size: 1.5rem; margin-top: 10px; color: #1f2937;">${visitor.name}</h2>
                        `);
                    }
                );
            } else {
                return res.send(`
                    <h1 style="color: #ef4444; font-size: 2rem;">Visit Already Completed</h1>
                    <h2 style="font-size: 1.5rem; margin-top: 10px; color: #1f2937;">${visitor.name}</h2>
                `);
            }
        }
    );
});





router.get('/temp-server-logs', verifyEmployeeOrSecurityToken, (req,res)=>{
    try {
        if (fs.existsSync('./server-logs.txt')) {
            const logs = fs.readFileSync('./server-logs.txt', 'utf8');
            res.send('<pre>' + logs + '</pre>');
        } else {
            res.send('No logs file found yet.');
        }
    } catch(e) {
        res.status(500).send(e.message);
    }
});

router.get('/secure-file/:fileType/:visitorId', (req, res) => {
    const { fileType, visitorId } = req.params;
    const tokenQuery = req.query.token;

    if (fileType !== 'photo' && fileType !== 'document') {
        return res.status(400).json({ message: 'Invalid file type' });
    }

    const checkAuthAndFetch = (isAuthorized) => {
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Access Denied: Unauthorized' });
        }

        const fieldName = fileType === 'photo' ? 'photo_path' : 'document_path';
        db.query(`SELECT ${fieldName} FROM visitors WHERE id = ?`, [visitorId], (err, rows) => {
            if (err || rows.length === 0) {
                return res.status(404).json({ message: 'Visitor or file not found' });
            }

            const rawUrl = rows[0][fieldName];
            if (!rawUrl) {
                return res.status(404).json({ message: 'File not uploaded' });
            }

            // Local file fallback
            if (!rawUrl.startsWith('http')) {
                const absolutePath = path.join(__dirname, '..', rawUrl);
                if (fs.existsSync(absolutePath)) {
                    return res.sendFile(absolutePath);
                }
                return res.status(404).json({ message: 'Local file not found' });
            }

            // Cloudinary URL parsing
            const splitKey = rawUrl.includes('/authenticated/') ? '/authenticated/' : '/upload/';
            const parts = rawUrl.split(splitKey);
            if (parts.length < 2) {
                return res.redirect(rawUrl);
            }

            let pathSegments = parts[1].split('/');
            pathSegments = pathSegments.filter(segment => {
                if (segment.startsWith('s--')) return false;
                if (/^v\d+$/.test(segment)) return false;
                return true;
            });

            let publicIdWithFormat = pathSegments.join('/');
            const lastDot = publicIdWithFormat.lastIndexOf('.');
            const publicId = lastDot !== -1 ? publicIdWithFormat.substring(0, lastDot) : publicIdWithFormat;

            const resourceTypeMatch = rawUrl.match(/res\.cloudinary\.com\/[^/]+\/([^/]+)/);
            const resourceType = resourceTypeMatch ? resourceTypeMatch[1] : 'image';
            const deliveryType = rawUrl.includes('/authenticated/') ? 'authenticated' : 'upload';

            try {
                const secureUrl = cloudinary.url(publicId, {
                    sign_url: true,
                    type: deliveryType,
                    resource_type: resourceType,
                    expires_at: Math.floor(Date.now() / 1000) + 900 // 15 minutes
                });
                res.redirect(secureUrl);
            } catch (signErr) {
                console.error('Error signing Cloudinary URL:', signErr);
                res.redirect(rawUrl);
            }
        });
    };

    const authHeader = req.headers['authorization'];
    const token = req.cookies.securityToken || req.cookies.employeeToken || (authHeader && authHeader.split(" ")[1]);

    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (!err && (decoded.role === 'security' || decoded.id)) {
                return checkAuthAndFetch(true);
            }
            if (tokenQuery) {
                db.query('SELECT pass_token FROM visitors WHERE id = ?', [visitorId], (dbErr, rows) => {
                    const isPassTokenValid = !dbErr && rows.length > 0 && rows[0].pass_token === tokenQuery;
                    return checkAuthAndFetch(isPassTokenValid);
                });
            } else {
                return checkAuthAndFetch(false);
            }
        });
    } else if (tokenQuery) {
        db.query('SELECT pass_token FROM visitors WHERE id = ?', [visitorId], (dbErr, rows) => {
            const isPassTokenValid = !dbErr && rows.length > 0 && rows[0].pass_token === tokenQuery;
            return checkAuthAndFetch(isPassTokenValid);
        });
    } else {
        return checkAuthAndFetch(false);
    }
});

module.exports = router;