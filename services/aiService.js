const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

/*
==========================================
OCR
==========================================
*/

async function extractDocumentDetails(imagePath, mimeType, documentType) {

    try {
        let imageBuffer;
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            const res = await fetch(imagePath);
            if (!res.ok) throw new Error(`Failed to fetch image from URL ${imagePath}: ${res.statusText}`);
            const arrayBuffer = await res.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
        } else {
            imageBuffer = fs.readFileSync(imagePath);
        }

        const base64Image = imageBuffer.toString("base64");

        const response =
            await ai.models.generateContent({

                model: "gemini-2.5-flash",

                contents: [
                    {
                        inlineData: {
                            mimeType,
                            data: base64Image
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

        text = text.replace(/```json/g, "");
        text = text.replace(/```/g, "");

        console.log("Gemini Raw Response:");
        console.log(text);

        return JSON.parse(text);

    } catch (error) {

        console.error("OCR AI ERROR");
        console.error(error);

        throw error;

    }

}



/*
==========================================
AI Verification
==========================================
*/

async function verifyVisitorDocument(
    imagePath,
    documentType,
    documentNumber,
    employeeNameInput,
    employeeList
) {

    try {

        console.log("========== AI VERIFY ==========");
        console.log("Image:", imagePath);
        console.log("Type:", documentType);
        console.log("Number:", documentNumber);
        console.log("Employee Name Input:", employeeNameInput);



        const absolutePath = path.join(
            process.cwd(),
            imagePath.replace(/^[/\\]/, "")
        );

        console.log("Working Directory :", process.cwd());
        console.log("Database Path     :", imagePath);

        let imageBuffer;
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            const res = await fetch(imagePath);
            if (!res.ok) throw new Error(`Failed to fetch image from URL ${imagePath}: ${res.statusText}`);
            const arrayBuffer = await res.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
        } else {
            const absolutePath = path.join(
                process.cwd(),
                imagePath.replace(/^[/\\]/, "")
            );
            console.log("Absolute Path     :", absolutePath);
            imageBuffer = fs.readFileSync(absolutePath);
        }

        const base64Image = imageBuffer.toString("base64");

        const response = await ai.models.generateContent({

            model: "gemini-2.5-flash",

            contents: [

                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: base64Image
                    }
                },

                {
                    text: `
You are an AI Security Assistant.

Analyze the uploaded visitor identity document.

Document Type:
${documentType}

Expected Document Number:
${documentNumber}

Also, match the visitor's manually entered host employee name to the correct employee from the organization list.
Manually entered host employee: "${employeeNameInput || ''}"
Actual Employee List:
${JSON.stringify(employeeList || [])}

Return ONLY valid JSON in this format:
{
  "confidence": 95,
  "documentReadable": true,
  "documentValid": true,
  "ocrMatched": true,
  "warnings": [],
  "recommendation": "Proceed",
  "matchedEmployee": {
    "id": null, // ID of the best matched employee from the Actual Employee List, or null if no match found
    "name": null, // Name of the matched employee, or null
    "department": null, // Department of the matched employee, or null
    "confidence": 0 // Match confidence percentage (0-100), or 0 if null
  }
}
`
                }

            ]

        });

        let text = response.text;

        console.log("Gemini Response:");
        console.log(text);

        text = text.replace(/```json/g, "");
        text = text.replace(/```/g, "");

        return JSON.parse(text);

    }

    catch (err) {

        console.error("AI SERVICE ERROR");
        console.error(err);

        throw err;

    }

}


module.exports = {

    extractDocumentDetails,
    verifyVisitorDocument

};