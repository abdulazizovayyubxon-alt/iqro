// SHUBHALI (hakam belgilagan) savollarni ko'rib chiqish uchun HTML.
// Har savolda: matn, variantlar (to'g'risi yashil), izoh, HAKAM sababi.
// "O'chirish" belgilab, pastdagi tugma orqali o'chiriladigan id ro'yxatini olasiz.
// node pipeline/make-shubhali-viewer.mjs
import fs from "fs";

const bank = JSON.parse(fs.readFileSync("fan/chqbt/gen_api_progress.json", "utf8"));
const report = JSON.parse(fs.readFileSync("pipeline/verify_report.json", "utf8"));

const byId = new Map(bank.map((q) => [String(q.id), q]));
const items = [];
for (const [id, v] of Object.entries(report)) {
  if (v.verdict !== "SHUBHALI") continue;
  const q = byId.get(id);
  if (!q) continue;
  items.push({ ...q, _sabab: v.sabab || "", _manual: parseInt(id, 10) >= 1045 });
}
items.sort((a, b) => a.id - b.id);

const html = `<!DOCTYPE html>
<html lang="uz"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CHQBT — SHUBHALI savollar ko'rigi</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;background:#0f172a;color:#e2e8f0;margin:0 auto;padding:20px;max-width:920px}
h1{color:#f87171;font-size:22px} .meta{color:#94a3b8;margin-bottom:16px}
.bar{position:sticky;top:0;background:#0f172a;padding:10px 0;border-bottom:1px solid #334155;z-index:5;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.bar button{background:#0284c7;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:14px}
.bar button.danger{background:#b91c1c}
.filters button{background:#1e293b;color:#e2e8f0;border:1px solid #334155;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:13px}
.filters button.act{background:#0284c7;border-color:#0284c7}
.card{background:#1e293b;border-radius:12px;padding:16px;margin-bottom:14px;border:1px solid #334155;position:relative}
.card.del{opacity:.5;border-color:#b91c1c;background:#3f1d1d}
.card.manual{border-left:4px solid #22c55e}
.idtag{position:absolute;top:12px;right:14px;font-size:12px;color:#64748b}
.q{font-weight:600;margin-bottom:10px;white-space:pre-wrap;padding-right:60px}
.tag{display:inline-block;font-size:11px;background:#334155;border-radius:6px;padding:2px 8px;margin-right:6px;color:#94a3b8}
.tag.m{background:#14532d;color:#bbf7d0}
.opt{padding:6px 10px;border-radius:8px;margin:4px 0;white-space:pre-wrap} .opt.ok{background:#14532d;color:#bbf7d0}
.exp{font-size:13px;color:#94a3b8;margin-top:8px;border-top:1px dashed #334155;padding-top:8px}
.hakam{font-size:13px;color:#fca5a5;margin-top:8px;background:#3f1d1d;border-radius:8px;padding:8px 10px}
.del-lbl{display:inline-flex;align-items:center;gap:6px;margin-top:10px;cursor:pointer;color:#fca5a5;font-size:14px;user-select:none}
.del-lbl input{width:18px;height:18px;cursor:pointer}
#out{width:100%;min-height:80px;background:#0b1220;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:10px;margin-top:8px;font-family:monospace;display:none}
</style></head><body>
<h1>CHQBT — hakam belgilagan SHUBHALI savollar</h1>
<div class="meta" id="meta"></div>
<div class="bar">
  <div class="filters">
    <button data-f="all" class="act">Hammasi</button>
    <button data-f="manual">Qo'lda yozilgan (yashil)</button>
    <button data-f="machine">Mashina (LLM)</button>
    <button data-f="del">O'chiriladiganlar</button>
  </div>
  <button id="genBtn">O'chiriladigan id ro'yxatini olish</button>
  <button id="allDel" class="danger">Ko'ringanlarni belgilash</button>
</div>
<textarea id="out" readonly></textarea>
<div id="list"></div>
<script>
const DATA=${JSON.stringify(items)};
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;");
const del=new Set();
let filt="all";
const list=document.getElementById("list");
function visible(){return DATA.filter(q=>filt==="all"||(filt==="manual"&&q._manual)||(filt==="machine"&&!q._manual)||(filt==="del"&&del.has(q.id)));}
function render(){
 list.innerHTML="";
 for(const q of visible()){
  const c=document.createElement("div");
  c.className="card"+(q._manual?" manual":"")+(del.has(q.id)?" del":"");
  let opts=""; for(const k of ["A","B","C","D"]) opts+='<div class="opt '+(k===q.answer?"ok":"")+'">'+k+") "+esc(q.options[k])+"</div>";
  c.innerHTML='<span class="idtag">id '+q.id+(q._manual?' · qo\\'lda':' · LLM')+'</span>'
   +'<div><span class="tag '+(["matching","sequence"].includes(q.qtype)?"m":"")+'">'+esc(q.qtype)+'</span><span class="tag">'+esc(q.difficulty||"")+'</span><span class="tag">'+esc((q.topic||"").slice(0,40))+"</span></div>"
   +'<div class="q">'+esc(q.question)+"</div>"+opts
   +'<div class="exp">💡 '+esc(q.explanation||"")+"</div>"
   +'<div class="hakam">⚖️ Hakam: '+esc(q._sabab)+"</div>"
   +'<label class="del-lbl"><input type="checkbox" '+(del.has(q.id)?"checked":"")+' data-id="'+q.id+'"> Bu savolni o\\'chirish</label>';
  c.querySelector("input").addEventListener("change",e=>{
    const id=+e.target.dataset.id;
    if(e.target.checked)del.add(id);else del.delete(id);
    c.classList.toggle("del",e.target.checked);
    updMeta();
  });
  list.appendChild(c);
 }
}
function updMeta(){document.getElementById("meta").textContent="Jami SHUBHALI: "+DATA.length+" | Qo'lda yozilgan: "+DATA.filter(q=>q._manual).length+" | O'chirishga belgilangan: "+del.size;}
document.querySelectorAll(".filters button").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".filters button").forEach(x=>x.classList.remove("act"));
  b.classList.add("act");filt=b.dataset.f;render();
}));
document.getElementById("genBtn").addEventListener("click",()=>{
  const out=document.getElementById("out");
  out.style.display="block";
  out.value=[...del].sort((a,b)=>a-b).join(",");
  out.select();
});
document.getElementById("allDel").addEventListener("click",()=>{
  for(const q of visible())del.add(q.id);render();updMeta();
});
updMeta();render();
</script></body></html>`;

fs.writeFileSync("chqbt_shubhali_korish.html", html);
console.log(`Yaratildi: chqbt_shubhali_korish.html | ${items.length} ta SHUBHALI savol (qo'lda: ${items.filter((q) => q._manual).length}, LLM: ${items.filter((q) => !q._manual).length})`);
