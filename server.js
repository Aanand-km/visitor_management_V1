const express = require('express');
const cors = require('cors');


const db = require('./db/db');
const visitorRoutes = require('./routes/visitor');
const employeeRoutes = require('./routes/employee');
const otpRoutes =
    require('./routes/otp');
const app = express();
const ocrRoutes =
    require('./routes/ocr');

app.use(cors());
app.use(express.json());
app.use('/visitor', visitorRoutes);
app.use('/otp', otpRoutes);
app.use('/ocr', ocrRoutes);
app.use('/employees', employeeRoutes);
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send('Visitor Management API Running');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});