const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const pdfPath = path.join(__dirname, 'fan', 'Бошланғич таълим ўзбек я.pdf');
const outputPath = path.join(__dirname, 'fan', 'boshlangich_spec_text.txt');

let dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync(outputPath, data.text);
    console.log("PDF parsed successfully. Total characters:", data.text.length);
    console.log("Preview of text:");
    console.log(data.text.substring(0, 1000));
}).catch(err => {
    console.error("Error parsing PDF:", err);
});
