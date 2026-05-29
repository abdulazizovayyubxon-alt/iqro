export function processQuestionsOnTheFly(allQ) {
  return allQ.map(qObj => {
    let qText = qObj.q || "";
    let opts = qObj.opts || [];
    let correct = qObj.correct ?? 0;
    let isModified = false;

    // 1. Savol kodlarini yanada qattiqroq tozalash (har qanday qavs ichidagi "Savol kodi" yozuvi)
    if (/(Savol kodi.*?\))/gi.test(qText)) {
      qText = qText.replace(/\s*\([^)]*Savol\s+kodi[^)]*\)/gi, '');
      isModified = true;
    }

    // Yoki shunchaki "Savol kodi: #XXX" ni olib tashlash
    qText = qText.replace(/\s*\(Savol kodi:\s*#[a-zA-Z0-9_-]+\)/gi, '');

    // 2. Moslashtirish savollarini (Y2/Y3) dinamik aralashtirish
    if (opts.length > 0 && /1\s*[-.]\s*[A-D]/i.test(opts[0])) {
      const lines = qText.split('\n');
      let choiceIndices = [];
      for (let i = 0; i < lines.length; i++) {
        if (/^[A-D][.)-]\s+/i.test(lines[i].trim())) {
          choiceIndices.push(i);
        }
      }

      if (choiceIndices.length >= 2 && choiceIndices.length <= 5) {
        let originalLines = choiceIndices.map(i => lines[i]);
        let originalLetters = originalLines.map(line => line.trim().match(/^[A-D]/i)[0].toUpperCase());
        let bodies = originalLines.map(line => line.replace(/^\s*[A-D][.)-]\s*/i, ''));
        
        let indices = originalLines.map((_, i) => i);
        // Aralashtirish
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
        
        choiceIndices.forEach((lineIdx, i) => {
          lines[lineIdx] = newLines[i];
        });
        
        qText = lines.join('\n');
        
        let newOptsText = opts.map(opt => {
          return opt.replace(/(\d+)\s*[-.]\s*([A-D])/gi, (match, p1, p2) => {
            const oldL = p2.toUpperCase();
            const newL = mappingOldToNew[oldL] || oldL;
            return `${p1}-${newL}`;
          });
        });
        
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
          if (oldIdx === correct) {
            finalCorrect = newIdx;
          }
        });

        opts = finalOpts;
        correct = finalCorrect;
        isModified = true;
      }
    }

    if (isModified) {
      return { ...qObj, q: qText, opts, correct };
    }
    return qObj;
  });
}
