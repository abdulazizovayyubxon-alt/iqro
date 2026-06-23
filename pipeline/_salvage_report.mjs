// Buzuq verify_report (crash da yarim yozilgan) dan valid verdiktlarni regex bilan qutqaradi.
import fs from "fs";
const p = "pipeline/verify_report_jismoniy_tarbiya.json";
const t = fs.readFileSync(p, "utf8");
const re = /"(\d+)":\s*\{\s*"verdict":\s*"(OK|SHUBHALI)",\s*"sabab":\s*"((?:[^"\\]|\\.)*)"\s*\}/g;
const rep = {};
let m;
while ((m = re.exec(t))) rep[m[1]] = { verdict: m[2], sabab: m[3] };
const ks = Object.keys(rep);
const sh = ks.filter((k) => rep[k].verdict === "SHUBHALI");
console.log(`qutqarilgan verdikt: ${ks.length} | shubhali: ${sh.length}`);
fs.copyFileSync(p, p + ".bak-corrupt");
fs.writeFileSync(p, JSON.stringify(rep, null, 1));
JSON.parse(fs.readFileSync(p, "utf8")); // tasdiq
console.log("✅ toza JSON qayta yozildi, resume tayyor");
