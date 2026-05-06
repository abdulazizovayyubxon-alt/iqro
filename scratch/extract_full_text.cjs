const mammoth = require("mammoth");
const path = require("path");
const fs = require("fs");

const docPath = path.join(__dirname, "..", "Qoshimcha 3", "json savol.docx");

mammoth.extractRawText({path: docPath})
    .then(function(result){
        const text = result.value; 
        fs.writeFileSync(path.join(__dirname, "extracted_questions.json_raw"), text);
        console.log("Extracted " + text.length + " characters.");
    })
    .catch(function(error) {
        console.error(error);
    });
