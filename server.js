const express = require('express');
const cors = require('cors');
require('dotenv').config();

console.log(process.env.GEMINI_API_KEY);

const db = require('./db/db');
const visitorRoutes = require('./routes/visitor');
const employeeRoutes = require('./routes/employee');
const otpRoutes =
    require('./routes/otp');
const app = express();
const ocrRoutes =
    require('./routes/ocr');

const authRoutes =
require('./routes/auth');

app.use(cors());
app.use(express.json());
app.use('/visitor', visitorRoutes);
app.use('/otp', otpRoutes);
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

const db = require('./db/db');

app.get('/create-otp-table', (req, res) => {
  db.query(`
    CREATE TABLE IF NOT EXISTS otp_verifications (
      id INT NOT NULL AUTO_INCREMENT,
      phone VARCHAR(15) DEFAULT NULL,
      otp VARCHAR(10) DEFAULT NULL,
      expires_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id)
    )
  `, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
