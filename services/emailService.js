const nodemailer = require('nodemailer');

const transporter =
    nodemailer.createTransport({

        service: 'gmail',

        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

async function sendEmployeeNotification(
    employeeEmail,
    visitor
) {

    await transporter.sendMail({

        from: process.env.EMAIL_USER,

        to: employeeEmail,

        subject:
            'New Visitor Registration',

        html: `

            <h2>New Visitor Request</h2>

            <p><b>Name:</b> ${visitor.name}</p>

            <p><b>Phone:</b> ${visitor.phone}</p>

            <p><b>Email:</b> ${visitor.email}</p>

            <p><b>Purpose:</b> ${visitor.purpose}</p>

            <hr>

            <p>Please login to approve this visitor.</p>

        `
    });
}

module.exports = {
    sendEmployeeNotification
};