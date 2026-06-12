// Google Gemini API ni test qilish (OpenAI-compat endpoint orqali)
import fs from 'fs';

for (const line of fs.readFileSync('.env','utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g,'');
}

const KEY = process.env.GEMINI_API_KEY;
console.log('Kalit (bosh):', KEY?.slice(0,15)+'...');

// Gemini 2.0 Flash sinash
for (const model of ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash-preview-05-20']) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
      method: 'POST',
      headers: {'Content-Type':'application/json', 'Authorization': `Bearer ${KEY}`},
      body: JSON.stringify({
        model,
        messages: [{role:'user', content:'Say: OK'}],
        max_tokens: 20
      })
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    console.log(`[${model}] HTTP ${res.status} ->`, content || JSON.stringify(data.error || data).slice(0,120));
  } catch(e) {
    console.log(`[${model}] ERROR:`, e.message);
  }
}
