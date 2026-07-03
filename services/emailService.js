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
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:25px 10px;font-family:Arial,sans-serif;">
<tr>
<td align="center">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;">

<tr>
<td style="background:#111111;padding:25px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:28px;">
Visitor Management System
</h1>

<p style="margin:10px 0 0;color:#f59e0b;font-size:16px;">
New Visitor Approval Request
</p>
</td>
</tr>

<tr>
<td style="padding:30px;">

<p style="font-size:16px;color:#333333;">
Hello,
</p>

<p style="font-size:15px;color:#555555;line-height:24px;">
A new visitor has requested entry into the premises.
Please review the visitor details below.
</p>

<table width="100%" cellpadding="10" cellspacing="0" style="margin-top:20px;border-collapse:collapse;">

<tr style="background:#fafafa;">
<td><b>Visitor Name</b></td>
<td>${visitor.name}</td>
</tr>

<tr>
<td><b>Phone</b></td>
<td>${visitor.phone}</td>
</tr>

<tr style="background:#fafafa;">
<td><b>Email</b></td>
<td>${visitor.email}</td>
</tr>

<tr>
<td><b>Purpose</b></td>
<td>${visitor.purpose}</td>
</tr>

</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:35px;">
<tr>

<td align="center">

<a href="${approveLink}"
style="
background:#16a34a;
color:#ffffff;
padding:14px 28px;
text-decoration:none;
font-weight:bold;
border-radius:6px;
display:inline-block;">
APPROVE
</a>

</td>

</tr>

<tr><td height="15"></td></tr>

<tr>

<td align="center">

<a href="${rejectLink}"
style="
background:#dc2626;
color:#ffffff;
padding:14px 28px;
text-decoration:none;
font-weight:bold;
border-radius:6px;
display:inline-block;">
REJECT
</a>

</td>

</tr>

</table>

</td>
</tr>

<tr>

<td style="
background:#f8f8f8;
padding:20px;
text-align:center;
font-size:12px;
color:#777777;
line-height:20px;">

This email was generated automatically by
<b>Visitor Management System</b>.

<br><br>

Please do not reply to this email.

</td>

</tr>

</table>

</td>
</tr>
</table>
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
<div style="max-width:650px;margin:auto;font-family:Arial,sans-serif;background:#f4f6f9;padding:30px;">

    <div style="background:#111827;color:white;padding:20px;text-align:center;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;">Visitor Management System</h1>
        <p style="margin-top:8px;color:#d1d5db;">
            Visitor Pass Approved
        </p>
    </div>

    <div style="background:white;padding:30px;border-radius:0 0 12px 12px;">

        <h2>Hello ${visitorName},</h2>

        <p>
            Your visitor request has been approved.
        </p>

        <table style="width:100%;margin-top:20px;border-collapse:collapse;">

            <tr>
                <td style="padding:12px;font-weight:bold;">Pass ID</td>
                <td>${passId}</td>
            </tr>

            <tr style="background:#f9fafb;">
                <td style="padding:12px;font-weight:bold;">Status</td>
                <td style="color:#16a34a;font-weight:bold;">
                    Approved
                </td>
            </tr>

        </table>

        <div style="margin-top:35px;text-align:center;">

            <a href="${passLink}"
               style="
               background:#2563eb;
               color:white;
               padding:14px 35px;
               border-radius:8px;
               text-decoration:none;
               font-weight:bold;">
               View Visitor Pass
            </a>

        </div>

        <p style="margin-top:30px;">
            Please keep your visitor pass ready while entering the premises.
        </p>

        <hr style="margin:40px 0;">

        <p style="color:#6b7280;font-size:13px;text-align:center;">
            This email was automatically generated by the
            Visitor Management System.
        </p>

    </div>

</div>
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