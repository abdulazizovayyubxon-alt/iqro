import fs from "fs";
for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const { PIPELINE_API_BASE: BASE, PIPELINE_API_KEY: KEY } = process.env;
const res = await fetch(`${BASE}/models`, { headers: { Authorization: `Bearer ${KEY}` } });
console.log("BASE:", BASE, "| /models status:", res.status);
const data = await res.json().catch(() => null);
if (data?.data) for (const m of data.data) console.log("  -", m.id);
else console.log((await res.text?.() || JSON.stringify(data)).slice(0, 800));
