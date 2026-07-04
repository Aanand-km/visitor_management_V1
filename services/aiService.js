const fs = require("fs");
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
        const imageBuffer = fs.readFileSync(imagePath);

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
    documentNumber
) {

    try {

        console.log("========== AI VERIFY ==========");
        console.log("Image:", imagePath);
        console.log("Type:", documentType);
        console.log("Number:", documentNumber);

        const imageBuffer = fs.readFileSync(imagePath);

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

Return ONLY valid JSON.

{
  "confidence":95,
  "documentReadable":true,
  "documentValid":true,
  "ocrMatched":true,
  "warnings":[],
  "recommendation":"Proceed" 
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