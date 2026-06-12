// Oltin bank (gold_bank.json) savollarini ko'rish uchun HTML.
// Sxema: cognitive (bloom o'rnida), source_file (manba fayl), hammasi single.
// node pipeline/make-gold-viewer.mjs [--in fan/chqbt/gold_bank.json] [--out chqbt_oltin_korish.html]
import fs from "fs";

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const inPath = A("--in", "fan/chqbt/gold_bank.json");
const outPath = A("--out", "chqbt_oltin_korish.html");

const data = JSON.parse(fs.readFileSync(inPath, "utf8"));

// repair_state bo'lsa — ta'mirlanган/ta'mirlanmagan belgisini qo'shamiz
let state = {};
if (fs.existsSync("pipeline/repair_state.json")) {
  try { state = JSON.parse(fs.readFileSync("pipeline/repair_state.json", "utf8")); } catch {}
}

const html = `<!DOCTYPE html>
<html lang="uz"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CHQBT — Oltin bank (812)</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;background:#0f172a;color:#e2e8f0;margin:0 auto;padding:20px;max-width:920px}
h1{color:#fbbf24;font-size:22px} .meta{color:#94a3b8;margin-bottom:12px}
.bar{position:sticky;top:0;background:#0f172a;padding:10px 0;border-bottom:1px solid #334155;z-index:5;display:flex;gap:8px;flex-wrap:wrap}
.bar button{background:#1e293b;color:#e2e8f0;border:1px solid #334155;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:13px}
.bar button.act{background:#d97706;border-color:#d97706;color:#fff}
.card{background:#1e293b;border-radius:12px;padding:16px;margin-bottom:14px;border:1px solid #334155;border-left:4px solid #fbbf24;position:relative}
.idtag{position:absolute;top:12px;right:14px;font-size:12px;color:#64748b}
.src{font-size:12px;color:#fcd34d;background:#78350f33;border-radius:8px;padding:6px 10px;margin-bottom:8px}
.q{font-weight:600;margin-bottom:10px;white-space:pre-wrap;padding-right:55px}
.tag{display:inline-block;font-size:11px;background:#334155;border-radius:6px;padding:2px 8px;margin-right:6px;color:#94a3b8}
.tag.unrep{background:#7f1d1d;color:#fecaca}
.opt{padding:6px 10px;border-radius:8px;margin:4px 0;white-space:pre-wrap} .opt.ok{background:#14532d;color:#bbf7d0}
.exp{font-size:13px;color:#94a3b8;margin-top:8px;border-top:1px dashed #334155;padding-top:8px}
.mn{font-size:12px;color:#fbbf24;margin-top:4px}
#more{width:100%;padding:12px;background:#d97706;color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:15px}
</style></head><body>
<h1>CHQBT — Oltin bank (darslikka langarlangan asl korpus)</h1>
<div class="meta" id="meta"></div>
<div class="bar" id="flt"></div>
<div id="list"></div>
<button id="more">Yana 20 ta ko'rsatish</button>
<script>
const DATA=${JSON.stringify(data.map((q) => ({ ...q, _unrep: state[q.id] === "unrepaired" })))};
let fmode="hammasi", shown=0; const PAGE=20;
const list=document.getElementById("list");
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;");
function fdata(){
 if(fmode==="hammasi")return DATA;
 if(fmode==="unrep")return DATA.filter(q=>q._unrep);
 return DATA.filter(q=>(q.difficulty||"")===fmode);
}
function render(reset){ if(reset){list.innerHTML="";shown=0;}
 const d=fdata(); const slice=d.slice(shown,shown+PAGE); shown+=slice.length;
 for(const q of slice){ const c=document.createElement("div"); c.className="card";
  let opts=""; for(const k of ["A","B","C","D"]) opts+='<div class="opt '+(k===q.answer?"ok":"")+'">'+k+") "+esc(q.options[k])+"</div>";
  c.innerHTML='<span class="idtag">id '+q.id+'</span>'
   +'<div class="src">📖 '+esc(q.source_file||"")+(q.subtopic?" · "+esc(q.subtopic):"")+"</div>"
   +'<div><span class="tag">'+esc(q.difficulty||"")+'</span><span class="tag">'+esc(q.cognitive||"")+'</span>'+(q._unrep?'<span class="tag unrep">ta\\'mirlanmagan</span>':'')+"</div>"
   +'<div class="q">'+esc(q.question)+"</div>"+opts
   +'<div class="exp">💡 '+esc(q.explanation||"")+"</div>"
   +(q.mnemonic?'<div class="mn">🧠 '+esc(q.mnemonic)+"</div>":"");
  list.appendChild(c);}
 document.getElementById("more").style.display = shown>=d.length?"none":"block";
 const unrep=DATA.filter(q=>q._unrep).length;
 document.getElementById("meta").textContent="Jami: "+DATA.length+" ta | Ta'mirlanmagan (cue-leak): "+unrep+" | Ko'rsatilmoqda: "+shown+" / "+d.length;
}
const modes=[["hammasi","Hammasi"],["Y1","Y1"],["Y2","Y2"],["Y3","Y3"],["unrep","Ta'mirlanmagan"]];
const flt=document.getElementById("flt");
modes.forEach(([m,lbl],i)=>{const b=document.createElement("button");
 const cnt=m==="hammasi"?DATA.length:(m==="unrep"?DATA.filter(q=>q._unrep).length:DATA.filter(q=>(q.difficulty||"")===m).length);
 b.textContent=lbl+" ("+cnt+")";if(i===0)b.className="act";
 b.onclick=()=>{document.querySelectorAll("#flt button").forEach(x=>x.classList.remove("act"));b.classList.add("act");fmode=m;render(true);};flt.appendChild(b);});
document.getElementById("more").onclick=()=>render(false);
render(true);
</script></body></html>`;

fs.writeFileSync(outPath, html);
const unrep = data.filter((q) => state[q.id] === "unrepaired").length;
console.log(`Yaratildi: ${outPath} | ${data.length} ta oltin savol (ta'mirlanmagan: ${unrep})`);
