const fs = require('fs');
const path = require('path');

function moveQuestions() {
    const q0Path = 'src/data/questions_0.js';
    const q6Path = 'src/data/questions_6.js';
    const q7Path = 'src/data/questions_7.js';

    let q0Content = fs.readFileSync(q0Path, 'utf8');
    let q6Content = fs.readFileSync(q6Path, 'utf8');
    let q7Content = fs.readFileSync(q7Path, 'utf8');

    // 1. Parse objects (roughly)
    // We need to extract the array content.
    function getArray(content) {
        const start = content.indexOf('[');
        const end = content.lastIndexOf(']');
        return JSON.parse(content.substring(start, end + 1));
    }

    const q0 = getArray(q0Content);
    const q6 = getArray(q6Content);
    const q7 = getArray(q7Content);

    console.log(`Initial counts: Q0: ${q0.length}, Q6: ${q6.length}, Q7: ${q7.length}`);

    // Misplaced in Q6 (Art Pedagogy) - starting from "O'quvchilarning ijodiy qobiliyatini..."
    // Based on L1574 in my previous view_file, which is q6[156] roughly? 
    // Wait, let's find the index by question text.
    const artPedStartText = "O'quvchilarning ijodiy qobiliyatini rivojlantirish uchun qaysi dars turi ko'proq mos keladi?";
    const artPedIdx = q6.findIndex(q => q.q === artPedStartText);
    
    let artPedQuestions = [];
    if (artPedIdx !== -1) {
        artPedQuestions = q6.splice(artPedIdx);
        console.log(`Found ${artPedQuestions.length} Art Pedagogy questions in Q6 starting at index ${artPedIdx}`);
    }

    // Misplaced in Q7 (CHQBT and General Pedagogy)
    // CHQBT ends at line 146, General Pedagogy ends at line 194.
    // Art starts at line 195: "Narsalar va buyumlar majmuasini tasvirlovchi janr qaysi?"
    const artStartText = "Narsalar va buyumlar majmuasini tasvirlovchi janr qaysi?";
    const artIdx = q7.findIndex(q => q.q === artStartText);

    let misplacedInQ7 = [];
    if (artIdx !== -1) {
        misplacedInQ7 = q7.splice(0, artIdx);
        console.log(`Found ${misplacedInQ7.length} misplaced questions in Q7`);
    }

    // Split misplacedInQ7 into CHQBT and General Pedagogy
    // General Pedagogy starts with "Tarbiyada 'Shaxsiy namuna'..." (Line 147)
    const genPedStartText = "Tarbiyada 'Shaxsiy namuna' (Ibrat) metodining o'rni qanday?";
    const genPedIdx = misplacedInQ7.findIndex(q => q.q === genPedStartText);

    let chqbtFromQ7 = [];
    let genPedFromQ7 = [];

    if (genPedIdx !== -1) {
        chqbtFromQ7 = misplacedInQ7.slice(0, genPedIdx);
        genPedFromQ7 = misplacedInQ7.slice(genPedIdx);
        console.log(`Split misplaced Q7 into ${chqbtFromQ7.length} CHQBT and ${genPedFromQ7.length} General Pedagogy`);
    } else {
        chqbtFromQ7 = misplacedInQ7;
    }

    // 2. Re-distribute
    q0.push(...chqbtFromQ7);
    q6.push(...genPedFromQ7);
    q7.push(...artPedQuestions);

    console.log(`Final counts: Q0: ${q0.length}, Q6: ${q6.length}, Q7: ${q7.length}`);

    // 3. Save back
    fs.writeFileSync(q0Path, `export const q0_harbiy_xizmat = ${JSON.stringify(q0, null, 2)};\n`, 'utf8');
    fs.writeFileSync(q6Path, `export const q6_pedagogik_mahorat = ${JSON.stringify(q6, null, 2)};\n`, 'utf8');
    fs.writeFileSync(q7Path, `export const q7_tasviriy_sanat = ${JSON.stringify(q7, null, 2)};\n`, 'utf8');

    console.log("Success!");
}

moveQuestions();
