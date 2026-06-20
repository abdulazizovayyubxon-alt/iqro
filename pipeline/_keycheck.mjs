// Cerebras kalitlarining limitini tekshiradi — har biriga minimal so'rov yuboradi.
// 200 = limit bor (yangilangan), 429 = limit tugagan, 401 = kalit yaroqsiz.
import fs from "fs";

for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const BASE = process.env.PIPELINE_API_BASE;
const MODEL = process.env.PIPELINE_API_MODEL;
const keys = process.env.PIPELINE_API_KEY.split(",").map((k) => k.trim()).filter(Boolean);

console.log(`BASE: ${BASE}  MODEL: ${MODEL}  Kalitlar: ${keys.length}\n`);

let ok = 0, limited = 0, bad = 0, other = 0;
for (let i = 0; i < keys.length; i++) {
  const k = keys[i];
  const tag = `#${String(i + 1).padStart(2, "0")} ...${k.slice(-6)}`;
  try {
    const res = await fetch(BASE + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + k },
      body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: "hi" }], max_tokens: 1 }),
    });
    let note = "";
    const rl = res.headers.get("x-ratelimit-remaining-tokens-day") || res.headers.get("x-ratelimit-remaining-requests-day");
    if (rl) note = ` (qolgan: ${rl})`;
    if (res.status === 200) { ok++; console.log(`✅ ${tag}  200 OK${note}`); }
    else if (res.status === 429) { limited++; console.log(`⛔ ${tag}  429 LIMIT TUGAGAN${note}`); }
    else if (res.status === 401) { bad++; console.log(`🔑 ${tag}  401 KALIT YAROQSIZ`); }
    else {
      other++;
      const body = await res.text();
      console.log(`❓ ${tag}  ${res.status}  ${body.slice(0, 120)}`);
    }
  } catch (e) {
    other++;
    console.log(`💥 ${tag}  XATO: ${e.message}`);
  }
}

console.log(`\n— Xulosa —`);
console.log(`✅ Limit bor (ishlaydi): ${ok}`);
console.log(`⛔ Limit tugagan: ${limited}`);
console.log(`🔑 Yaroqsiz kalit: ${bad}`);
console.log(`❓ Boshqa: ${other}`);
