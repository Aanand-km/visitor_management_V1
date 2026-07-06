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
    departmentInput,
    employeeList
) {

    try {

        console.log("========== AI VERIFY ==========");
        console.log("Image:", imagePath);
        console.log("Type:", documentType);
        console.log("Number:", documentNumber);
        console.log("Employee Name Input:", employeeNameInput);
        console.log("Department Input:", departmentInput);



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

Also, verify the visitor's manually entered host employee name and department against the Actual Employee List.
Manually entered host employee: "${employeeNameInput || ''}"
Selected host department: "${departmentInput || ''}"
Actual Employee List:
${JSON.stringify(employeeList || [])}

Rules for host employee verification:
1. Match the visitor's manually entered employee name against the Actual Employee List (allow spelling variations, nicknames, or partial names).
2. Check if the matched employee belongs to the selected host department.
3. If the employee does not exist in the database at all:
   - set matchedEmployee.id, name, department to null, and confidence to 0.
   - Add this warning to the warnings array: "No such employee in this department"
4. If the employee exists in the database but belongs to a DIFFERENT department than the selected host department:
   - set matchedEmployee.id, name, department, confidence to the database employee's correct values.
   - Add this warning to the warnings array: "This very employee is in other department: [Actual Department Name]"
   - set matchedEmployee.departmentMismatch to true.

Return ONLY valid JSON in this format:
{
  "confidence": 95,
  "documentReadable": true,
  "documentValid": true,
  "ocrMatched": true,
  "warnings": [], // Add document warnings or department/employee mismatch warnings here!
  "recommendation": "Proceed",
  "matchedEmployee": {
    "id": null, // ID of matched employee, or null
    "name": null, // Name of matched employee, or null
    "department": null, // Department of matched employee, or null
    "confidence": 0, // Match confidence percentage (0-100), or 0 if null
    "departmentMismatch": false // True if matched employee belongs to a different department than selected
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
async function matchEmployeeWithAI(employeeNameInput, employeeList) {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    text: `
You are a database entity matching assistant.
Match the manually entered employee name/details to the correct employee from the organization list.

Input name to meet: "${employeeNameInput}"
Actual Employee List:
${JSON.stringify(employeeList)}

Return ONLY valid JSON in this format:
{
  "id": null, // ID of the best matched employee from the Actual Employee List, or null if no match found
  "name": null, // Name of the matched employee, or null
  "department": null, // Department of the matched employee, or null
  "confidence": 0 // Match confidence percentage (0-100), or 0 if null
}
`
                }
            ]
        });

        let text = response.text;
        text = text.replace(/```json/g, "").replace(/```/g, "");
        return JSON.parse(text);
    } catch (e) {
        console.error("AI Matching helper error:", e);
        return null;
    }
}

module.exports = {
    extractDocumentDetails,
    verifyVisitorDocument,
    matchEmployeeWithAI
};