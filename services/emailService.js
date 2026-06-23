const SibApiV3Sdk = require('@getbrevo/brevo');

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

apiInstance.setApiKey(
    SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY
);

async function sendEmployeeNotification(employeeEmail, visitor) {

    await apiInstance.sendTransacEmail({
        sender: {
            email: 'anandkm539@gmail.com',
            name: 'Visitor Management System'
        },

        to: [
            {
                email: employeeEmail
            }
        ],

        subject: 'New Visitor Registration',

        htmlContent: `
            <h2>New Visitor Request</h2>

            <p><b>Name:</b> ${visitor.name}</p>

            <p><b>Phone:</b> ${visitor.phone}</p>

            <p><b>Email:</b> ${visitor.email}</p>

            <p><b>Purpose:</b> ${visitor.purpose}</p>

            <hr>

            <p>Please login to approve this visitor.</p>
        `
    });

    console.log("Employee email sent");
}

async function sendVisitorPassEmail(
    visitorEmail,
    visitorName,
    visitorId,
    passId
) {

    const passLink =
        `https://visitor-management-jp03.onrender.com/visitor-pass.html?id=${visitorId}`;

    await apiInstance.sendTransacEmail({
        sender: {
            email: 'anandkm539@gmail.com',
            name: 'Visitor Management System'
        },

        to: [
            {
                email: visitorEmail
            }
        ],

        subject: 'Visitor Pass Approved',

        htmlContent: `
            <h2>Visitor Pass Approved</h2>

            <p>Hello ${visitorName},</p>

            <p>Your visitor request has been approved.</p>

            <p><b>Pass ID:</b> ${passId}</p>

            <p>
                <a href="${passLink}">
                    Open Visitor Pass
                </a>
            </p>
        `
    });

    console.log("Visitor pass email sent");
}

module.exports = {
    sendEmployeeNotification,
    sendVisitorPassEmail
};