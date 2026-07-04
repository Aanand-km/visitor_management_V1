const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const securityRoutes = require("./routes/security");

const db = require('./db/db');
const visitorRoutes = require('./routes/visitor');
const employeeRoutes = require('./routes/employee');

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



const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
