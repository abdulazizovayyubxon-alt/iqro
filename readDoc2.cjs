const mammoth = require("mammoth");
mammoth.extractRawText({path: "77777.docx"})
    .then(function(result){
        const text = result.value; 
        console.log(text.substring(3000, 8000)); // Print next 5000 chars
    })
    .catch(function(error) {
        console.error(error);
    });
