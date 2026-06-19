const nodemailer = require('nodemailer');
console.log("EMAIL SERVICE LOADED");

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});
 transporter.verify(function(error, success) {
    if (error) {
        console.log("SMTP ERROR:", error);
    } else {
        console.log("SMTP READY");
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
async function sendVisitorPassEmail(
    visitorEmail,
    visitorName,
    visitorId,
    passId
) {

    const passLink =`https://visitor-management-jp03.onrender.com/visitor-pass.html?id=${visitorId}`;

    await transporter.sendMail({

        from: process.env.EMAIL_USER,

        to: visitorEmail,

        subject: 'Visitor Pass Approved',

        html: `

            <h2>Visitor Pass Approved</h2>

            <p>Hello ${visitorName},</p>

            <p>Your visitor request has been approved.</p>

            <p>
                <b>Pass ID:</b>
                ${passId}
            </p>

            <p>
                View your pass:
            </p>

            <a href="${passLink}">
                Open Visitor Pass
            </a>

            <br><br>

            <p>
                Please carry this pass during your visit.
            </p>

        `
    });
   
}

module.exports = {
    sendEmployeeNotification,
    sendVisitorPassEmail
};