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

app.get('/create-employees-table', (req, res) => {
  db.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) DEFAULT NULL,
      department VARCHAR(100) DEFAULT NULL,
      email VARCHAR(100) DEFAULT NULL,
      password VARCHAR(255) DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY unique_email (email)
    )
  `, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

app.get('/employees-count', (req, res) => {
  db.query(
    'SELECT COUNT(*) AS count FROM employees',
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

app.get('/insert-employees', (req, res) => {
  const sql = `
    INSERT INTO employees (id, name, department, email, password)
    VALUES
    (3, 'Manish Gaur', 'IT', 'anandkm539@gmail.com', '$2b$10$qoHigHQHVIIikvVVRtEN7O3CNiGHtJQ/BWdiHCR757qvIEEDZTWPO'),
    (5, 'Anand', '', 'anand@groz.com', '$2b$10$3FqWhLCV4JaULrv6ROZtR.NTv9ScfZrl9rZd0NU2kk45c3UE8oz0G'),
    (7, 'Rahul Sharma', 'IT', 'rahul@groz.com', '$2b$10$aQcz3So8HhiKOiJw0D9gf.m774w8qcLI0mm8Kb6xLpj0/cv6DcwPi')
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true, inserted: result.affectedRows });
  });
});

app.get('/create-visitors-table', (req, res) => {
  db.query(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(100),
      phone VARCHAR(15),
      email VARCHAR(100),
      aadhaar_number VARCHAR(50),
      purpose TEXT,
      employee_id INT,
      photo_path VARCHAR(255),
      status VARCHAR(50) DEFAULT 'pending',
      pass_id VARCHAR(100),
      qr_code LONGTEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME NULL,
      check_in_time DATETIME NULL,
      check_out_time DATETIME NULL,
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
