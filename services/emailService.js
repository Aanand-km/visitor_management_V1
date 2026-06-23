async function sendEmployeeNotification(employeeEmail, visitor) {

    const response = await fetch(
        'https://api.brevo.com/v3/smtp/email',
        {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
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
                `
            })
        }
    );

    const data = await response.json();
    console.log('Employee Email:', data);
}

async function sendVisitorPassEmail(
    visitorEmail,
    visitorName,
    visitorId,
    passId
) {

    const passLink =
        `https://visitor-management-jp03.onrender.com/visitor-pass.html?id=${visitorId}`;

    const response = await fetch(
        'https://api.brevo.com/v3/smtp/email',
        {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
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
                    <p>Hello ${visitorName}</p>
                    <p><b>Pass ID:</b> ${passId}</p>
                    <a href="${passLink}">
                        Open Visitor Pass
                    </a>
                `
            })
        }
    );

    const data = await response.json();
    console.log('Visitor Email:', data);
}

module.exports = {
    sendEmployeeNotification,
    sendVisitorPassEmail
};