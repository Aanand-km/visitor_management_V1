const express = require('express');
const router = express.Router();

const multer = require('multer');
const fs = require('fs');

const { GoogleGenAI } =
    require('@google/genai');

const ai =
    new GoogleGenAI({
        apiKey:
            process.env.GEMINI_API_KEY
    });

const upload = multer({
    dest: 'uploads/'
});

router.post(
    '/upload',
    upload.single('document'),
    async (req, res) => {

        try {
            const imageBuffer =
                fs.readFileSync(
                    req.file.path
                );
            const documentType = req.body.documentType;
            const base64Image =
                imageBuffer.toString(
                    'base64'
                );

            const response =
                await ai.models.generateContent({

                    model: 'gemini-2.5-flash',

                    contents: [

                        {
                            inlineData: {

                                mimeType:
                                    req.file.mimetype,

                                data:
                                    base64Image
                            }
                        },

                        {
                            text: `
You are an OCR engine.

The uploaded identity document is a ${documentType}.

Extract ONLY the following information visible in the image.

1. Name
2. Document Number

Rules:

- The document number must belong to the selected document type.
- Do NOT return phone number.
- Do NOT return address.
- Do NOT return father's name.
- Do NOT return DOB.
- Do NOT return issue date.
- Do NOT return expiry date.
- Do NOT return gender.
- Do NOT return any explanation.
- If any value is missing, return an empty string.

Return ONLY valid JSON.

{
    "name": "",
    "documentNumber": ""
}
`
                        }
                    ]
                });

            let text = response.text;

            text = text.replace(
                /```json/g,
                ''
            );

            text = text.replace(
                /```/g,
                ''
            );

            console.log("Gemini Raw Response:", text);

            let data;

            try {

                data = JSON.parse(text);

            } catch {

                return res.status(500).json({
                    message: "Invalid OCR Response"
                });

            }

            res.json(data);

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: 'OCR Failed'
            });
        }
    }
);

router.get('/gemini-test', async (req, res) => {

    try {

        const response =
            await ai.models.generateContent({

                model: 'gemini-2.5-flash',

                contents:
                    'Reply with: Gemini Connected Successfully'

            });

        res.json({
            message:
                response.text
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                error.message
        });
    }
});

module.exports = router;