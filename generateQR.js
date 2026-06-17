const QRCode = require('qrcode');

// Replace with your Render URL
const visitorFormURL =
  'https://visitor-management-jp03.onrender.com/visitor-form.html';

QRCode.toFile(
  'visitor-form-qr.png',
  visitorFormURL,
  {
    width: 500,
    margin: 2
  },
  (err) => {
    if (err) {
      console.error('QR Generation Failed:', err);
      return;
    }

    console.log('✅ QR Code Generated Successfully!');
  }
);