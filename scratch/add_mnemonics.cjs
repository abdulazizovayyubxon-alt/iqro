const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const FILES = ['questions_0.js', 'questions_1.js', 'questions_2.js', 'questions_3.js', 'questions_4.js', 'questions_5.js', 'questions_6.js'];

const rules = [
    { key: "5.45", val: "74-yilda 5.45 kalibrga o'tildi (7-4 = 3 emas, 5 ga yaqin)." },
    { key: "7.62", val: "Eski qurol (AK-47), katta kalibr: 7.62." },
    { key: "200 metr", val: "F-1 (Formula 1) tezligi 200+ bo'lganidek, radiusi ham 200m." },
    { key: "25 metr", val: "RGD-5 (5) ning kvadrati 25 metr." },
    { key: "10 dona", val: "Snayperda 10 ta barmoqdek aniqlik (SVD o'qdoni)." },
    { key: "825 m/s", val: "PKM: Sakkiz yuz (8) yigirma besh (25) - kuchli tezlik." },
    { key: "900 m/s", val: "AK-74: To'qqiz yuz (900) - zamonaviy va tezkor." },
    { key: "1000 m", val: "AK-74 nishoni: Toppa-to'g'ri 1 km (1000m)." },
    { key: "1500 m", val: "PKM masofasi: Bir yarim (1.5) kilometr." },
    { key: "18 %", val: "Kislorod 18% bo'lsa - xavfsiz (18 yoshdek balog'at)." },
    { key: "8 soat", val: "Sakkiz (8) soat uyqu - askar uchun baxt." },
    { key: "27 yosh", val: "27 yosh - rezervga o'tish chegara yoshi." },
    { key: "12 oy", val: "Bir yil = 12 oy = Muddatli xizmat muddati." }
];

FILES.forEach(file => {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    
    // We need to parse the array, add mnemonic, and stringify back.
    // But these are JS files with 'export const ... = [...]'
    // I'll use a simpler approach: regex find objects and add the property.
    
    const objRegex = /\{[\s\S]*?q:[\s\S]*?opts:[\s\S]*?\[[\s\S]*?\][\s\S]*?correct:[\s\S]*?\d[\s\S]*?explanation:[\s\S]*?\}/g;
    
    const updatedContent = content.replace(objRegex, (match) => {
        // Skip if mnemonic already exists
        if (match.includes('mnemonic:')) return match;

        let mnemonic = "";
        const lowerMatch = match.toLowerCase();

        for (const rule of rules) {
            if (lowerMatch.includes(rule.key.toLowerCase())) {
                mnemonic = rule.val;
                break;
            }
        }

        if (!mnemonic) {
            // Generic mnemonics based on context
            if (lowerMatch.includes("nizom")) mnemonic = "Nizom - bu harbiy tartib asosi.";
            else if (lowerMatch.includes("vazifa")) mnemonic = "Har bir vazifa - mas'uliyat.";
            else if (lowerMatch.includes("unvon")) mnemonic = "Unvonlar - harbiy zinapoya.";
            else if (lowerMatch.includes("tibbiy")) mnemonic = "Tibbiy yordam - hayot saqlash.";
            else if (lowerMatch.includes("taktika")) mnemonic = "Taktika - aqlli jang qilish san'ati.";
            else mnemonic = "Kalit so'zga e'tibor bering va javobni vizuallashtiring.";
        }

        // Insert mnemonic before the closing }
        return match.replace(/\}\s*$/, `    mnemonic: "${mnemonic}"\n  }`);
    });

    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`Updated mnemonics in ${file}`);
});
