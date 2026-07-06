async function sendEmployeeNotification(employeeEmail, visitor) {
    const approveLink =
        `https://visitor-management-jp03.onrender.com/visitor/approve-mail/${visitor.id}?token=${visitor.token}`;

    const rejectLink =
        `https://visitor-management-jp03.onrender.com/visitor/reject-mail/${visitor.id}?token=${visitor.token}`;
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
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Visitor Registration</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f8;padding:20px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);border-collapse:separate;">
                    <!-- Header -->
                    <tr>
                        <td style="background-color:#111827;padding:30px 20px;text-align:center;">
                            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;letter-spacing:-0.5px;">
                                Visitor Management System
                            </h1>
                            <p style="margin:8px 0 0;color:#f59e0b;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
                                New Visitor Request
                            </p>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding:30px 20px;">
                            <p style="margin:0 0 16px;font-size:16px;color:#111827;font-weight:bold;">Hello,</p>
                            <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;">
                                A new visitor has requested entry to meet you. Please review their details and choose an action below.
                            </p>
                            
                            <!-- Details Table -->
                            <table width="100%" cellpadding="12" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate;margin-bottom:30px;">
                                <tr style="background-color:#f9fafb;">
                                    <td width="35%" style="font-size:14px;color:#6b7280;font-weight:bold;border-bottom:1px solid #e5e7eb;">Visitor Name</td>
                                    <td style="font-size:14px;color:#111827;font-weight:bold;border-bottom:1px solid #e5e7eb;">${visitor.name}</td>
                                </tr>
                                <tr>
                                    <td style="font-size:14px;color:#6b7280;font-weight:bold;border-bottom:1px solid #e5e7eb;">Phone</td>
                                    <td style="font-size:14px;color:#111827;border-bottom:1px solid #e5e7eb;">${visitor.phone}</td>
                                </tr>
                                <tr style="background-color:#f9fafb;">
                                    <td style="font-size:14px;color:#6b7280;font-weight:bold;border-bottom:1px solid #e5e7eb;">Email</td>
                                    <td style="font-size:14px;color:#111827;border-bottom:1px solid #e5e7eb;">${visitor.email}</td>
                                </tr>
                                <tr>
                                    <td style="font-size:14px;color:#6b7280;font-weight:bold;">Purpose</td>
                                    <td style="font-size:14px;color:#111827;">${visitor.purpose}</td>
                                </tr>
                            </table>

                            <!-- Action Buttons -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="padding-bottom:16px;">
                                        <a href="${approveLink}" style="background-color:#16a34a;color:#ffffff;padding:14px 40px;text-decoration:none;font-weight:bold;font-size:15px;border-radius:8px;display:inline-block;width:80%;max-width:260px;text-align:center;box-shadow:0 2px 4px rgba(22,163,74,0.2);">
                                            APPROVE VISIT
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <a href="${rejectLink}" style="background-color:#dc2626;color:#ffffff;padding:14px 40px;text-decoration:none;font-weight:bold;font-size:15px;border-radius:8px;display:inline-block;width:80%;max-width:260px;text-align:center;box-shadow:0 2px 4px rgba(220,38,38,0.2);">
                                            REJECT VISIT
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f9fafb;padding:24px 20px;text-align:center;font-size:12px;color:#9ca3af;line-height:1.5;border-top:1px solid #f3f4f6;">
                            This email was automatically generated by the <strong>Visitor Management System</strong>.<br>
                            Please do not reply directly to this email.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
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
    passId,
    passToken
) {

    const passLink =
        `https://visitor-management-jp03.onrender.com/visitor-pass.html?id=${visitorId}&token=${passToken}`;

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
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visitor Pass Approved</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f8;padding:20px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);border-collapse:separate;">
                    <!-- Header -->
                    <tr>
                        <td style="background-color:#1e3a8a;padding:30px 20px;text-align:center;">
                            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;letter-spacing:-0.5px;">
                                Visitor Management System
                            </h1>
                            <p style="margin:8px 0 0;color:#93c5fd;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
                                Pass Approved
                            </p>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding:30px 20px;">
                            <p style="margin:0 0 16px;font-size:18px;color:#111827;font-weight:bold;">Hello ${visitorName},</p>
                            <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
                                Your visitor request has been approved. Below are your pass details. Please keep your pass ready upon entry.
                            </p>
                            
                            <!-- Details Table -->
                            <table width="100%" cellpadding="14" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate;margin-bottom:30px;">
                                <tr style="background-color:#f9fafb;">
                                    <td width="35%" style="font-size:14px;color:#6b7280;font-weight:bold;border-bottom:1px solid #e5e7eb;">Pass ID</td>
                                    <td style="font-size:14px;color:#111827;font-weight:bold;border-bottom:1px solid #e5e7eb;">${passId}</td>
                                </tr>
                                <tr>
                                    <td style="font-size:14px;color:#6b7280;font-weight:bold;">Status</td>
                                    <td style="font-size:14px;color:#16a34a;font-weight:bold;">Approved</td>
                                </tr>
                            </table>

                            <!-- Action Button -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center">
                                        <a href="${passLink}" style="background-color:#2563eb;color:#ffffff;padding:14px 40px;text-decoration:none;font-weight:bold;font-size:15px;border-radius:8px;display:inline-block;width:80%;max-width:280px;text-align:center;box-shadow:0 2px 4px rgba(37,99,235,0.2);">
                                            VIEW VISITOR PASS
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin:24px 0 0;font-size:14px;color:#6b7280;line-height:1.5;text-align:center;">
                                Please carry a digital or printed copy of this pass during your visit.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f9fafb;padding:24px 20px;text-align:center;font-size:12px;color:#9ca3af;line-height:1.5;border-top:1px solid #f3f4f6;">
                            This email was automatically generated by the <strong>Visitor Management System</strong>.<br>
                            Please do not reply directly to this email.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`
            })
        }
    );

    const data = await response.json();
    console.log('Visitor Email:', data);
}

async function sendVisitorRejectionEmail(recipientEmail, visitorName, reason) {
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
                    name: 'Visitor Management System',
                    email: process.env.BREVO_USER
                },
                to: [
                    {
                        email: recipientEmail,
                        name: visitorName
                    }
                ],
                subject: `Visitor Request Rejected - Visitor Management`,
                htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visitor Request Rejected</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;-webkit-font-smoothing:antialiased;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6;padding:20px 0;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="background-color:#dc2626;padding:40px 20px;text-align:center;">
                            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;line-height:1.2;">
                                Request Rejected
                            </h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding:40px 30px;background-color:#ffffff;">
                            <h2 style="margin:0 0 16px;font-size:20px;color:#111827;font-weight:600;">
                                Hello ${visitorName},
                            </h2>
                            <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
                                Unfortunately, your request to visit our facility has been rejected. Below are the details of the rejection.
                            </p>
                            
                            <!-- Details Table -->
                            <table width="100%" cellpadding="14" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate;margin-bottom:30px;">
                                <tr style="background-color:#f9fafb;">
                                    <td width="35%" style="font-size:14px;color:#6b7280;font-weight:bold;border-bottom:1px solid #e5e7eb;">Visitor Name</td>
                                    <td style="font-size:14px;color:#111827;font-weight:bold;border-bottom:1px solid #e5e7eb;">${visitorName}</td>
                                </tr>
                                <tr>
                                    <td style="font-size:14px;color:#6b7280;font-weight:bold;border-bottom:1px solid #e5e7eb;">Rejection Reason</td>
                                    <td style="font-size:14px;color:#dc2626;font-weight:bold;border-bottom:1px solid #e5e7eb;">${reason || 'Not specified'}</td>
                                </tr>
                                <tr>
                                    <td style="font-size:14px;color:#6b7280;font-weight:bold;">Status</td>
                                    <td style="font-size:14px;color:#dc2626;font-weight:bold;">Rejected</td>
                                </tr>
                            </table>

                            <p style="margin:24px 0 0;font-size:14px;color:#6b7280;line-height:1.5;text-align:center;">
                                If you believe this is a mistake, please reach out to your contact person or register again.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f9fafb;padding:24px 20px;text-align:center;font-size:12px;color:#9ca3af;line-height:1.5;border-top:1px solid #f3f4f6;">
                            This email was automatically generated by the <strong>Visitor Management System</strong>.<br>
                            Please do not reply directly to this email.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`
            })
        }
    );

    const data = await response.json();
    console.log('Rejection Email:', data);
}

module.exports = {
    sendEmployeeNotification,
    sendVisitorPassEmail,
    sendVisitorRejectionEmail
};