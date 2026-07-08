const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const fs = require('fs');

const originalConsoleError = console.error;
const originalConsoleLog = console.log;

console.error = function(...args) {
    try {
        fs.appendFileSync('./server-logs.txt', `[ERROR] ${new Date().toISOString()} - ${args.map(a => {
            if (a instanceof Error) return a.message + '\n' + a.stack;
            return typeof a === 'object' ? JSON.stringify(a) : a;
        }).join(' ')}\n`);
    } catch(e) {}
    originalConsoleError.apply(console, args);
};

console.log = function(...args) {
    try {
        fs.appendFileSync('./server-logs.txt', `[LOG] ${new Date().toISOString()} - ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}\n`);
    } catch(e) {}
    originalConsoleLog.apply(console, args);
};
const securityRoutes = require("./routes/security");

const db = require('./db/db');
const visitorRoutes = require('./routes/visitor');
const employeeRoutes = require('./routes/employee');

// Self-healing database schema migrations
function runMigrations() {
    const columns = [
        { name: 'pass_token', type: 'VARCHAR(255) NULL' },
        { name: 'employee_name_input', type: 'VARCHAR(255) NULL' },
        { name: 'department_input', type: 'VARCHAR(100) NULL' },
        { name: 'rejection_reason', type: 'VARCHAR(255) NULL' },
        { name: 'rejected_at', type: 'DATETIME NULL' }
    ];

    columns.forEach(col => {
        db.query(`SHOW COLUMNS FROM visitors LIKE '${col.name}'`, (err, rows) => {
            if (err) {
                console.error(`Error checking column ${col.name}:`, err);
                return;
            }
            if (rows.length === 0) {
                db.query(`ALTER TABLE visitors ADD COLUMN ${col.name} ${col.type}`, (alterErr) => {
                    if (alterErr) {
                        console.error(`Failed to add column ${col.name} to visitors table:`, alterErr);
                    } else {
                        console.log(`Successfully added column ${col.name} to visitors table.`);
                    }
                });
            }
        });
    });
}
runMigrations();

const app = express();
const ocrRoutes =
    require('./routes/ocr');

const authRoutes =
    require('./routes/auth');

const cookieParser = require('cookie-parser');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// General API limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per window
    message: { message: 'Too many requests from this IP, please try again later.' }
});

// Strict auth & registration rate limiter
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 login/register requests per window
    message: { message: 'Too many login or registration attempts. Please try again after 15 minutes.' }
});

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(cookieParser());
app.use(express.json());

// Mount rate limiters
app.use('/visitor/register', authLimiter);
app.use('/security/login', authLimiter);
app.use('/auth/login', authLimiter);
app.use('/visitor', apiLimiter);
app.use('/security', apiLimiter);

app.use('/visitor', visitorRoutes);
app.use("/security", securityRoutes);
app.use('/ocr', ocrRoutes);
app.use('/employees', employeeRoutes);
app.use('/auth', authRoutes);
app.use(express.static('public'));
app.use(
    '/uploads',
    express.static('uploads')
);

app.get('/', (req, res) => {
    res.send('Visitor Management API Running');
});

app.use((err, req, res, next) => {
    console.error("=== GLOBAL ERROR HANDLER ===");
    console.error(err.stack || err);
    res.status(500).json({
        message: "Internal Server Error",
        error: err.message || err
    });
});



const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
