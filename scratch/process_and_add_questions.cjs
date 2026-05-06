const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, 'extracted_questions.json_raw');
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

// Categories mapping
const CATEGORIES = {
    q0_harbiy_xizmat: 'questions_0.js',
    q1_umumharbiy_nizomlar: 'questions_1.js',
    q2_otish_tayyorgarligi: 'questions_2.js',
    q3_taktik_tayyorgarlik: 'questions_3.js',
    q4_fuqaro_muhofazasi: 'questions_4.js',
    q5_tibbiy_bilim: 'questions_5.js',
    q6_pedagogik_mahorat: 'questions_6.js'
};

function cleanQuestionText(text) {
    if (!text) return "";
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function run() {
    // 1. Load raw text
    let rawText = fs.readFileSync(RAW_FILE, 'utf8');
    
    // 2. Extract JSON objects from raw text
    // The raw text might have multiple blocks like [...] [...] or objects {...} {...}
    // We'll use a regex to find all objects
    const questions = [];
    const objRegex = /\{[\s\S]*?"q":[\s\S]*?"opts":[\s\S]*?\[[\s\S]*?\][\s\S]*?"correct":[\s\S]*?\d[\s\S]*?"explanation":[\s\S]*?\}[\s\S]*?/g;
    
    let match;
    while ((match = objRegex.exec(rawText)) !== null) {
        try {
            // Basic cleaning for common JSON errors in docx extraction
            let jsonStr = match[0].trim();
            // Remove trailing commas if any inside the object (though not expected in valid JSON)
            // Fix smart quotes if any
            jsonStr = jsonStr.replace(/[\u201C\u201D]/g, '"');
            
            // Try parsing
            // Since it's not strictly valid JSON sometimes (e.g. missing quotes on keys or trailing commas), 
            // we might need a more lenient parser or just eval (risky but okay for scratch)
            // But let's try JSON.parse first after some fixes
            
            // Actually, many of these might be valid-ish JS objects.
            // Let's use a trick to parse them safely
            const qObj = eval("(" + jsonStr + ")");
            if (qObj.q && qObj.opts) {
                questions.push(qObj);
            }
        } catch (e) {
            // Skip invalid ones
            // console.error("Failed to parse block:", e.message);
        }
    }

    console.log(`Found ${questions.length} questions in docx.`);

    // 3. Load existing questions to check for duplicates
    const existingQuestions = new Set();
    for (const file of Object.values(CATEGORIES)) {
        const filePath = path.join(DATA_DIR, file);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            // Extract question texts - supporting both q: and "q": and 'q':
            const qMatches = content.match(/(?:["']?q["']?)\s*:\s*["']([\s\S]*?)["']\s*,/g);
            if (qMatches) {
                qMatches.forEach(m => {
                    const qTextMatch = m.match(/(?:["']?q["']?)\s*:\s*["']([\s\S]*?)["']/);
                    if (qTextMatch) {
                        existingQuestions.add(cleanQuestionText(qTextMatch[1]));
                    }
                });
            }
        }
    }

    console.log(`Loaded ${existingQuestions.size} existing questions.`);

    // 4. Filter duplicates and categorize
    const categorized = {};
    Object.keys(CATEGORIES).forEach(k => categorized[k] = []);

    let addedCount = 0;
    let duplicateCount = 0;

    questions.forEach(q => {
        const cleaned = cleanQuestionText(q.q);
        if (existingQuestions.has(cleaned)) {
            duplicateCount++;
            return;
        }

        // Categorization logic
        const text = (q.q + " " + q.explanation).toLowerCase();
        let cat = "q0_harbiy_xizmat"; // default

        if (text.includes("tibbiy") || text.includes("yordam") || text.includes("shina") || text.includes("jarohat")) {
            cat = "q5_tibbiy_bilim";
        } else if (text.includes("pedagogik") || text.includes("metodika") || text.includes("o'qitish") || text.includes("ta'lim")) {
            cat = "q6_pedagogik_mahorat";
        } else if (text.includes("fuqaro muhofazasi") || text.includes("radiatsiya") || text.includes("kimyoviy") || text.includes("ofat")) {
            cat = "q4_fuqaro_muhofazasi";
        } else if (text.includes("taktika") || text.includes("jang") || text.includes("hujum") || text.includes("mudofaa") || text.includes("razvedka")) {
            cat = "q3_taktik_tayyorgarlik";
        } else if (text.includes("o'q") || text.includes("qurol") || text.includes("avtomat") || text.includes("miltiq") || text.includes("pulemyot") || text.includes("ballistika") || text.includes("kalibr") || text.includes("tezlik") || text.includes("masofa")) {
            cat = "q2_otish_tayyorgarligi";
        } else if (text.includes("nizom") || text.includes("intizom") || text.includes("huquq") || text.includes("majburiyat") || text.includes("qonun")) {
            cat = "q1_umumharbiy_nizomlar";
        }

        categorized[cat].push(q);
        existingQuestions.add(cleaned); // avoid adding same question twice if it appears twice in docx
        addedCount++;
    });

    console.log(`Duplicates skipped: ${duplicateCount}`);
    console.log(`New questions to add: ${addedCount}`);

    // 5. Append to files
    for (const [cat, qs] of Object.entries(categorized)) {
        if (qs.length === 0) continue;

        const fileName = CATEGORIES[cat];
        const filePath = path.join(DATA_DIR, fileName);
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        const newEntries = qs.map(q => {
            return `  {
    q: ${JSON.stringify(q.q)},
    opts: ${JSON.stringify(q.opts)},
    correct: ${q.correct},
    explanation: ${JSON.stringify(q.explanation)}
  }`;
        }).join(",\n");

        // Append before the last ];
        const updatedContent = content.trim().replace(/\]\s*;\s*$/, `,\n${newEntries}\n];`);
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`Added ${qs.length} questions to ${fileName} (${cat})`);
    }
}

run();
