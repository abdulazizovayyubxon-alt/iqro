// Claude qo'lda yozgan savollarni (id oralig'i) manba langari bilan ko'rish uchun HTML.
// Har savolda: 📖 source_construct (darslik §/mavzu), matn, variantlar (to'g'risi yashil), izoh, mnemonic.
// node pipeline/make-mine-viewer.mjs [--from 1045] [--to 1200]
import fs from "fs";

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const from = parseInt(A("--from", "1045"), 10);
const to = parseInt(A("--to", "1200"), 10);

const bank = JSON.parse(fs.readFileSync("fan/chqbt/gen_api_progress.json", "utf8"));
const data = bank.filter((q) => q.id >= from && q.id <= to);

const html = `<!DOCTYPE html>
<html lang="uz"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CHQBT — Claude yozgan savollar (rejim ko'rigi)</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;background:#0f172a;color:#e2e8f0;margin:0 auto;padding:20px;max-width:920px}
h1{color:#22c55e;font-size:22px} .meta{color:#94a3b8;margin-bottom:12px}
.bar{position:sticky;top:0;background:#0f172a;padding:10px 0;border-bottom:1px solid #334155;z-index:5;display:flex;gap:8px;flex-wrap:wrap}
.bar button{background:#1e293b;color:#e2e8f0;border:1px solid #334155;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:13px}
.bar button.act{background:#16a34a;border-color:#16a34a}
.card{background:#1e293b;border-radius:12px;padding:16px;margin-bottom:14px;border:1px solid #334155;border-left:4px solid #22c55e;position:relative}
.idtag{position:absolute;top:12px;right:14px;font-size:12px;color:#64748b}
.src{font-size:12px;color:#7dd3fc;background:#0c4a6e33;border-radius:8px;padding:6px 10px;margin-bottom:8px}
.q{font-weight:600;margin-bottom:10px;white-space:pre-wrap;padding-right:55px}
.tag{display:inline-block;font-size:11px;background:#334155;border-radius:6px;padding:2px 8px;margin-right:6px;color:#94a3b8}
.tag.m{background:#14532d;color:#bbf7d0}
.opt{padding:6px 10px;border-radius:8px;margin:4px 0;white-space:pre-wrap} .opt.ok{background:#14532d;color:#bbf7d0}
.exp{font-size:13px;color:#94a3b8;margin-top:8px;border-top:1px dashed #334155;padding-top:8px}
.mn{font-size:12px;color:#fbbf24;margin-top:4px}
#more{width:100%;padding:12px;background:#16a34a;color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:15px}
</style></head><body>
<h1>CHQBT — Claude qo'lda yozgan savollar (darslik langari bilan)</h1>
<div class="meta" id="meta"></div>
<div class="bar" id="flt"></div>
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
  c.innerHTML='<span class="idtag">id '+q.id+'</span>'
   +'<div class="src">📖 '+esc(q.source_construct||"")+"</div>"
   +'<div><span class="tag '+(["matching","sequence"].includes(q.qtype)?"m":"")+'">'+esc(q.qtype)+'</span><span class="tag">'+esc(q.difficulty||"")+'</span><span class="tag">'+esc(q.bloom_level||"")+'</span><span class="tag">'+esc((q.topic||"")+" · "+(q.subtopic||""))+"</span></div>"
   +'<div class="q">'+esc(q.question)+"</div>"+opts
   +'<div class="exp">💡 '+esc(q.explanation||"")+"</div>"
   +(q.mnemonic?'<div class="mn">🧠 '+esc(q.mnemonic)+"</div>":"");
  list.appendChild(c);}
 document.getElementById("more").style.display = shown>=d.length?"none":"block";
 document.getElementById("meta").textContent="Jami: "+DATA.length+" ta (id "+${from}+"–"+${to}+") | Ko'rsatilmoqda: "+shown+" / "+d.length;
}
const types=["hammasi","single","matching","sequence"];
const flt=document.getElementById("flt");
types.forEach((t,i)=>{const b=document.createElement("button");b.textContent=t+" ("+(t==="hammasi"?DATA.length:DATA.filter(q=>q.qtype===t).length)+")";if(i===0)b.className="act";
 b.onclick=()=>{document.querySelectorAll("#flt button").forEach(x=>x.classList.remove("act"));b.classList.add("act");ftype=t;render(true);};flt.appendChild(b);});
document.getElementById("more").onclick=()=>render(false);
render(true);
</script></body></html>`;

fs.writeFileSync("chqbt_claude_savollar_korish.html", html);
console.log(`Yaratildi: chqbt_claude_savollar_korish.html | ${data.length} ta savol (id ${from}-${to})`);
