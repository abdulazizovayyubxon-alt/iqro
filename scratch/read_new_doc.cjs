const mammoth = require("mammoth");
const path = require("path");

const docPath = path.join(__dirname, "..", "Qoshimcha 3", "json savol.docx");

mammoth.extractRawText({path: docPath})
    .then(function(result){
        const text = result.value; 
        console.log(text);
    })
    .catch(function(error) {
        console.error(error);
    });
