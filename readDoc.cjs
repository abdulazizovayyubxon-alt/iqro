const mammoth = require("mammoth");
mammoth.extractRawText({path: "77777.docx"})
    .then(function(result){
        const text = result.value; // The raw text
        console.log(text.substring(0, 3000)); // Print first 3000 chars to understand structure
    })
    .catch(function(error) {
        console.error(error);
    });
