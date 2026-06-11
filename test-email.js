require('dotenv').config();

const nodemailer = require('nodemailer');

const transporter =
    nodemailer.createTransport({

        service: 'gmail',

        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

transporter.sendMail({

    from: process.env.EMAIL_USER,

    to: process.env.EMAIL_USER,

    subject: 'VMS Email Test',

    text: 'Employee notification system is working.'

}, (err, info) => {

    if (err) {

        console.log(err);

    } else {

        console.log('Email Sent');
    }
});