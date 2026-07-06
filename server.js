const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
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

app.use(cors());
app.use(express.json());
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
