import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function shuffleMatchingQuestion(qText, originalOpts, originalCorrect) {
  // Regex to extract lines starting with A., B., C., D. (or A), A -, etc)
  const regex = /\n([A-D][.)-]\s+.*?)(?=\n[A-D][.)-]\s+|\n*$|$)/gis;
  
  // Actually, string.matchAll with regex containing \n might be tricky.
  // Better to split by newline and find lines starting with A-D
  const lines = qText.split('\n');
  let choiceIndices = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (/^[A-D][.)-]\s+/i.test(lines[i].trim())) {
      choiceIndices.push(i);
    }
  }

  // If we don't have exactly 3 or 4 choices, or they are not contiguous (mostly), it's risky to parse.
  if (choiceIndices.length < 2 || choiceIndices.length > 5) return null;
  
  let originalLines = choiceIndices.map(i => lines[i]);
  let originalLetters = originalLines.map(line => line.trim().match(/^[A-D]/i)[0].toUpperCase());
  
  let bodies = originalLines.map(line => line.replace(/^\s*[A-D][.)-]\s*/i, ''));
  
  let indices = originalLines.map((_, i) => i);
  // Shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  let newLines = [];
  let mappingOldToNew = {};
  
  indices.forEach((oldIdx, newIdx) => {
    const newLetter = originalLetters[newIdx];
    const oldLetter = originalLetters[oldIdx];
    newLines.push(`${newLetter}. ${bodies[oldIdx]}`);
    mappingOldToNew[oldLetter] = newLetter;
  });
  
  // Replace in lines array
  choiceIndices.forEach((lineIdx, i) => {
    lines[lineIdx] = newLines[i];
  });
  
  let newQText = lines.join('\n');
  
  // Now we must update the correct option text and ALL other options text based on the mapping
  // We actually need to map EVERY option because if an option was "1-A, 2-B" we want to map it to the new letters.
  let newOptsText = originalOpts.map(opt => {
    // opt is like "A) 1-A, 2-B, 3-C"
    // We want to replace the letters AFTER the numbers.
    // e.g. "1-A" -> "1-mapping[A]"
    // Use a replacer for digit followed by dash/dot/space and a letter A-D
    return opt.replace(/(\d+)\s*[-.]\s*([A-D])/gi, (match, p1, p2) => {
      const oldL = p2.toUpperCase();
      const newL = mappingOldToNew[oldL] || oldL;
      return `${p1}-${newL}`;
    });
  });
  
  // After transforming options, we should also SHUFFLE the options array so the correct answer isn't always at the same index
  let optsIndices = [0, 1, 2, 3].slice(0, newOptsText.length);
  for (let i = optsIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [optsIndices[i], optsIndices[j]] = [optsIndices[j], optsIndices[i]];
  }
  
  let finalOpts = [];
  let finalCorrect = 0;
  
  optsIndices.forEach((oldIdx, newIdx) => {
    const optPrefix = ['A) ', 'B) ', 'C) ', 'D) '][newIdx];
    const optBody = newOptsText[oldIdx].replace(/^[A-D]\)\s*/i, '');
    finalOpts.push(optPrefix + optBody);
    
    if (oldIdx === originalCorrect) {
      finalCorrect = newIdx;
    }
  });

  return { newQText, finalOpts, finalCorrect };
}

async function main() {
  console.log("🔍 Fetching all questions...");
  const snap = await getDocs(collection(db, 'questions'));
  console.log(`📊 Total: ${snap.size} questions`);
  
  const docsToUpdate = [];

  snap.docs.forEach(docSnap => {
    const data = docSnap.data();
    let updates = {};
    let needsUpdate = false;
    
    let qText = data.q || "";
    
    // Remove (Savol kodi: #...)
    if (/\(Savol kodi:\s*#[a-zA-Z0-9_-]+\)/gi.test(qText)) {
      qText = qText.replace(/\s*\(Savol kodi:\s*#[a-zA-Z0-9_-]+\)/gi, '');
      updates.q = qText;
      needsUpdate = true;
    }
    
    // Check if matching question
    if (data.opts && data.opts.length > 0 && /1\s*[-.]\s*[A-D]/i.test(data.opts[0])) {
      // It's a matching question
      // Avoid re-processing if already very scrambled, but we can't tell easily.
      // We will just process it to be sure.
      const transformed = shuffleMatchingQuestion(qText, data.opts, data.correct ?? 0);
      if (transformed) {
        updates.q = transformed.newQText;
        updates.opts = transformed.finalOpts;
        updates.correct = transformed.finalCorrect;
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      docsToUpdate.push({ id: docSnap.id, updates });
    }
  });

  console.log(`\n🔧 Preparing to update ${docsToUpdate.length} documents...`);

  const BATCH_LIMIT = 400;
  let processed = 0;

  for (let i = 0; i < docsToUpdate.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = docsToUpdate.slice(i, i + BATCH_LIMIT);
    
    chunk.forEach(item => {
      batch.update(doc(db, 'questions', item.id), item.updates);
    });
    
    await batch.commit();
    processed += chunk.length;
    process.stdout.write(`\r⏳ ${processed}/${docsToUpdate.length} done`);
  }

  console.log(`\n\n✅ Finished! ${docsToUpdate.length} questions successfully fixed and scrubbed.`);
  process.exit(0);
}

main().catch(console.error);
