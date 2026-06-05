const express = require('express');
const router = express.Router();

const multer = require('multer');
const Tesseract = require('tesseract.js');

const upload = multer({
    dest: 'uploads/'
});

router.post(
    '/upload',
    upload.single('document'),
    async (req, res) => {

        try {

            const result =
                await Tesseract.recognize(
                    req.file.path,
                    'eng'
                );

           /* console.log(result.data.text);*/

            const text = result.data.text;

            const mobileMatch =
                text.match(/\b\d{10}\b/);

            const aadhaarMatch =
                text.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/);

            res.json({
                /*text,*/
                mobile:
                    mobileMatch
                        ? mobileMatch[0]
                        : null,
                aadhaar:
                    aadhaarMatch
                        ? aadhaarMatch[0]
                        : null
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: 'OCR Failed'
            });
        }
    }
);

module.exports = router;