// HAQIQIY generatsiya so'rovini bitta marta yuborib, Groq aniq nima qaytarishini ko'rsatadi
import fs from "fs";
import { chunkSpec } from "./lib/chunk.mjs";
import { buildGenPrompt } from "./lib/prompt.mjs";
import { loadMany } from "./lib/corpus.mjs";
for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const { PIPELINE_API_BASE: BASE, PIPELINE_API_KEY: KEY, PIPELINE_API_MODEL: MODEL } = process.env;
const chunks = chunkSpec(fs.readFileSync("scratch/_chqbt_test_src.txt", "utf8"), { maxChars: 2400 });
const c = chunks[2] || chunks[0];
const gold = await loadMany(["fan/chqbt_yangi"]);
const anchors = gold.filter((q) => q.qtype === "single").slice(0, 3);
const prompt = buildGenPrompt({ subjectName: "Harbiy ta'lim (CHQBT)", topicTitle: c.title, specChunk: c.text.trim(), anchors, existingTitles: [], count: 6, block: c.block });
console.log("PROMPT belgi:", prompt.length, "~token:", Math.round(prompt.length / 4), "| bo'lim:", c.title);
const t = Date.now();
const res = await fetch(`${BASE}/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
  body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.8, max_tokens: 4500, reasoning_effort: "low" }),
});
console.log("STATUS:", res.status, `(${Date.now() - t}ms)`, "| remaining-tokens:", res.headers.get("x-ratelimit-remaining-tokens"), "| retry-after:", res.headers.get("retry-after"));
const data = await res.json().catch(() => null);
if (!data) { console.log("NO JSON BODY:", (await res.text?.() || "").slice(0, 300)); process.exit(0); }
if (data.error) console.log("ERROR:", JSON.stringify(data.error));
const ch = data.choices?.[0];
console.log("finish_reason:", ch?.finish_reason, "| content uzunligi:", (ch?.message?.content || "").length);
console.log("usage:", JSON.stringify(data.usage));
console.log("--- CONTENT (ilk 1400 belgi) ---");
console.log((ch?.message?.content || "(BO'SH)").slice(0, 1400));
