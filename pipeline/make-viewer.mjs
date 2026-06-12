// Yangi tuzilgan savollarni brauzerda ko'rish uchun HTML yasaydi (ma'lumot ichiga joylanadi).
// node pipeline/make-viewer.mjs [--in fan/chqbt/gen_api_progress.json] [--out chqbt_savollar_korish.html]
import fs from "fs";

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const inPath = A("--in", "fan/chqbt/gen_api_progress.json");
const outPath = A("--out", "chqbt_savollar_korish.html");

const data = JSON.parse(fs.readFileSync(inPath, "utf8"));

const html = `<!DOCTYPE html>
<html lang="uz"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CHQBT yangi savollar — ko'rish</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;background:#0f172a;color:#e2e8f0;margin:0 auto;padding:20px;max-width:900px}
h1{color:#38bdf8;font-size:22px} .meta{color:#94a3b8;margin-bottom:16px}
.filters{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.filters button{background:#1e293b;color:#e2e8f0;border:1px solid #334155;padding:6px 14px;border-radius:8px;cursor:pointer}
.filters button.act{background:#0284c7;border-color:#0284c7}
.card{background:#1e293b;border-radius:12px;padding:16px;margin-bottom:14px;border:1px solid #334155}
.q{font-weight:600;margin-bottom:10px;white-space:pre-wrap}
.tag{display:inline-block;font-size:11px;background:#334155;border-radius:6px;padding:2px 8px;margin-right:6px;color:#94a3b8}
.opt{padding:6px 10px;border-radius:8px;margin:4px 0;white-space:pre-wrap} .opt.ok{background:#14532d;color:#bbf7d0}
.exp{font-size:13px;color:#94a3b8;margin-top:8px;border-top:1px dashed #334155;padding-top:8px}
.mn{font-size:12px;color:#fbbf24;margin-top:4px}
#more{width:100%;padding:12px;background:#0284c7;color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:15px}
</style></head><body>
<h1>CHQBT — yangi tuzilgan savollar</h1>
<div class="meta" id="meta"></div>
<div class="filters" id="flt"></div>
<div id="list"></div>
<button id="more">Yana 20 ta ko'rsatish</button>
<script>
const DATA=${JSON.stringify(data)};
let ftype="hammasi", shown=0; const PAGE=20;
const list=document.getElementById("list");
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;");
function fdata(){return ftype==="hammasi"?DATA:DATA.filter(q=>q.qtype===ftype);}
function render(reset){ if(reset){list.innerHTML="";shown=0;}
 const d=fdata(); const slice=d.slice(shown,shown+PAGE); shown+=slice.length;
 for(const q of slice){ const c=document.createElement("div"); c.className="card";
  let opts=""; for(const k of ["A","B","C","D"]) opts+='<div class="opt '+(k===q.answer?"ok":"")+'">'+k+") "+esc(q.options[k])+"</div>";
  c.innerHTML='<div><span class="tag">'+esc(q.qtype)+'</span><span class="tag">'+esc(q.difficulty||"")+'</span><span class="tag">'+esc(q.bloom_level||"")+'</span><span class="tag">'+esc((q.topic||"").slice(0,40))+"</span></div>"
   +'<div class="q">'+esc(q.question)+"</div>"+opts
   +'<div class="exp">💡 '+esc(q.explanation||"")+"</div>"
   +(q.mnemonic?'<div class="mn">🧠 '+esc(q.mnemonic)+"</div>":"");
  list.appendChild(c);}
 document.getElementById("more").style.display = shown>=d.length?"none":"block";
 document.getElementById("meta").textContent="Jami: "+DATA.length+" ta | Ko'rsatilmoqda: "+shown+" / "+d.length;
}
for(const t of ["hammasi","single","matching","sequence"]){
 const b=document.createElement("button"); b.textContent=t; if(t===ftype)b.className="act";
 b.onclick=()=>{ftype=t;document.querySelectorAll(".filters button").forEach(x=>x.className="");b.className="act";render(true);};
 document.getElementById("flt").appendChild(b);}
document.getElementById("more").onclick=()=>render(false);
render(true);
</script></body></html>`;

fs.writeFileSync(outPath, html, "utf8");
console.log("Yaratildi:", outPath, "|", data.length, "ta savol");
