import fs from 'fs';

// .env o'qish
for (const line of fs.readFileSync('.env','utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g,'');
}

const BASE = process.env.PIPELINE_API_BASE;
// PIPELINE_API_KEY vergul bilan ajratilgan ko'p kalit bo'lishi mumkin — birinchisini olamiz.
const keys = (process.env.PIPELINE_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
const KEY = keys[0];
const MODEL = process.env.PIPELINE_API_MODEL;
console.log('BASE:', BASE);
console.log('MODEL:', MODEL);
console.log('Kalitlar soni:', keys.length, '(test #1 ...' + (KEY ? KEY.slice(-6) : 'YO\'Q') + ')');

const res = await fetch(BASE+'/chat/completions', {
  method:'POST',
  headers:{'Content-Type':'application/json','Authorization':'Bearer '+KEY},
  body: JSON.stringify({
    model: MODEL,
    messages:[{role:'user',content:'Return ONLY valid JSON array with 1 test object. No markdown, no explanation. Format: [{"q":"test?","a":"yes"}]'}],
    temperature:0.5, max_tokens:1000, reasoning_effort:'low'
  })
});

const data = await res.json();
const content = data.choices?.[0]?.message?.content;
console.log('HTTP Status:', res.status);
console.log('RAW response:', JSON.stringify(content));
console.log('Error?:', data.error || 'none');
