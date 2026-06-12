// Rasmli savollarni RASMI bilan ko'rish uchun HTML (public/ ildizidan ochilsa rasm ko'rinadi).
// node pipeline/make-rasmli-viewer.mjs [--out chqbt_rasmli_korish.html]
import fs from "fs";

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const outPath = A("--out", "chqbt_rasmli_korish.html");

const FILES = ["rasmli_fv", "rasmli_jismoniy", "rasmli_otish", "rasmli_saf", "rasmli_taktik", "rasmli_tibbiy"];
const LBL = { rasmli_fv: "Fuqaro muhofazasi", rasmli_jismoniy: "Jismoniy", rasmli_otish: "Otish", rasmli_saf: "Saf", rasmli_taktik: "Taktik", rasmli_tibbiy: "Tibbiy" };

let data = [];
for (const f of FILES) {
  const obj = JSON.parse(fs.readFileSync("fan/chqbt_yangi/" + f + ".json", "utf8"));
  for (const q of obj.questions) data.push({ ...q, _cat: LBL[f] || f, _img: "public" + (q.image || "") });
}

const html = `<!DOCTYPE html>
<html lang="uz"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CHQBT — Rasmli savollar (${data.length})</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;background:#0f172a;color:#e2e8f0;margin:0 auto;padding:20px;max-width:920px}
h1{color:#a78bfa;font-size:22px} .meta{color:#94a3b8;margin-bottom:12px}
.bar{position:sticky;top:0;background:#0f172a;padding:10px 0;border-bottom:1px solid #334155;z-index:5;display:flex;gap:8px;flex-wrap:wrap}
.bar button{background:#1e293b;color:#e2e8f0;border:1px solid #334155;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:13px}
.bar button.act{background:#7c3aed;border-color:#7c3aed;color:#fff}
.card{background:#1e293b;border-radius:12px;padding:16px;margin-bottom:14px;border:1px solid #334155;border-left:4px solid #a78bfa;position:relative}
.idtag{position:absolute;top:12px;right:14px;font-size:12px;color:#64748b}
.src{font-size:12px;color:#c4b5fd;background:#4c1d9533;border-radius:8px;padding:6px 10px;margin-bottom:8px}
.imgwrap{text-align:center;margin:10px 0;background:#0b1220;border-radius:10px;padding:8px}
.imgwrap img{max-width:100%;max-height:340px;border-radius:8px}
.imgwrap .noimg{color:#f87171;font-size:13px;padding:20px}
.q{font-weight:600;margin-bottom:10px;white-space:pre-wrap;padding-right:55px}
.tag{display:inline-block;font-size:11px;background:#334155;border-radius:6px;padding:2px 8px;margin-right:6px;color:#94a3b8}
.tag.m{background:#14532d;color:#bbf7d0}
.opt{padding:6px 10px;border-radius:8px;margin:4px 0;white-space:pre-wrap} .opt.ok{background:#14532d;color:#bbf7d0}
.exp{font-size:13px;color:#94a3b8;margin-top:8px;border-top:1px dashed #334155;padding-top:8px}
.mn{font-size:12px;color:#fbbf24;margin-top:4px}
#more{width:100%;padding:12px;background:#7c3aed;color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:15px}
</style></head><body>
<h1>CHQBT — Rasmli savollar (darslik rasmlari asosida)</h1>
<div class="meta" id="meta"></div>
<div class="bar" id="flt"></div>
<div id="list"></div>
<button id="more">Yana 15 ta ko'rsatish</button>
<script>
const DATA=${JSON.stringify(data)};
let fcat="hammasi", shown=0; const PAGE=15;
const list=document.getElementById("list");
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;");
const cats=["hammasi",...[...new Set(DATA.map(q=>q._cat))]];
function fdata(){return fcat==="hammasi"?DATA:DATA.filter(q=>q._cat===fcat);}
function render(reset){ if(reset){list.innerHTML="";shown=0;}
 const d=fdata(); const slice=d.slice(shown,shown+PAGE); shown+=slice.length;
 for(const q of slice){ const c=document.createElement("div"); c.className="card";
  let opts=""; for(const k of ["A","B","C","D"]) opts+='<div class="opt '+(k===q.answer?"ok":"")+'">'+k+") "+esc(q.options[k])+"</div>";
  c.innerHTML='<span class="idtag">'+esc(q._cat)+' #'+q.id+'</span>'
   +'<div class="src">📖 '+esc(q.source||"")+(q.subtopic?" · "+esc(q.subtopic):"")+"</div>"
   +'<div class="imgwrap"><img src="'+esc(q._img)+'" alt="rasm" onerror="this.style.display=\\'none\\';this.nextSibling.style.display=\\'block\\'"><span class="noimg" style="display:none">⚠ Rasm topilmadi: '+esc(q._img)+' (HTMLни loyiha ildizidan oching)</span></div>'
   +'<div><span class="tag '+(["matching","sequence"].includes(q.qtype)?"m":"")+'">'+esc(q.qtype)+'</span><span class="tag">'+esc(q.difficulty||"")+'</span><span class="tag">'+esc(q.cognitive||"")+"</span></div>"
   +'<div class="q">'+esc(q.question)+"</div>"+opts
   +'<div class="exp">💡 '+esc(q.explanation||"")+"</div>"
   +(q.mnemonic?'<div class="mn">🧠 '+esc(q.mnemonic)+"</div>":"");
  list.appendChild(c);}
 document.getElementById("more").style.display = shown>=d.length?"none":"block";
 document.getElementById("meta").textContent="Jami: "+DATA.length+" ta rasmli savol | Ko'rsatilmoqda: "+shown+" / "+d.length;
}
const flt=document.getElementById("flt");
cats.forEach((t,i)=>{const b=document.createElement("button");
 b.textContent=t+" ("+(t==="hammasi"?DATA.length:DATA.filter(q=>q._cat===t).length)+")";if(i===0)b.className="act";
 b.onclick=()=>{document.querySelectorAll("#flt button").forEach(x=>x.classList.remove("act"));b.classList.add("act");fcat=t;render(true);};flt.appendChild(b);});
document.getElementById("more").onclick=()=>render(false);
render(true);
</script></body></html>`;

fs.writeFileSync(outPath, html);
console.log(`Yaratildi: ${outPath} | ${data.length} ta rasmli savol`);
