// Groq API ni test qilish
import fs from 'fs';

for (const line of fs.readFileSync('.env','utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g,'');
}

const KEY = process.env.PIPELINE_API_KEY; // Groq kaliti .env da
const GROQ_KEY = process.env.GROQ_API_KEY || process.env.PIPELINE_API_KEY;
const BASE = 'https://api.groq.com/openai/v1';

console.log('Groq test...');
const res = await fetch(`${BASE}/chat/completions`, {
  method: 'POST',
  headers: {'Content-Type':'application/json', 'Authorization': `Bearer ${GROQ_KEY}`},
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [{role:'user', content:'Return ONLY this JSON: [{"q":"test","a":"ok"}]'}],
    max_tokens: 50, temperature: 0.1
  })
});
const data = await res.json();
const content = data.choices?.[0]?.message?.content;
console.log('HTTP:', res.status);
console.log('Javob:', content || JSON.stringify(data.error).slice(0,200));
