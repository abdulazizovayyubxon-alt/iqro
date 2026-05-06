const mammoth = require("mammoth");
mammoth.extractRawText({path: "77777.docx"})
    .then(function(result){
        const text = result.value; 
        console.log(text.substring(8000, 13000)); // Print next 5000 chars
    })
    .catch(function(error) {
        console.error(error);
    });
