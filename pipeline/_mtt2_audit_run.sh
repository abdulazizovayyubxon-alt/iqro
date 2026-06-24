#!/bin/bash
# MTT2 audit — tarbiyachi + rahbar. verify-bank SERIAL (kalit faqat 429-rotatsiya) → parallellik = ko'p PROTSESS + kalit-slice.
# 2 faza: A=mut (2 fayl parallel, og'ir), B=pedkasb (2 fayl parallel, yengil). Har slice ≥13 kalit (audit saboq: <13 → 429 herd).
# Report'lar ALOHIDA slug: <slug>_mut / <slug>_pk (resume + checkpoint verify-bank ichida).
cd "C:/Users/User/Desktop/CHQBT PLATFORMA" || exit 1
ts(){ date "+%H:%M:%S"; }
KEYS=$(node -e 'const fs=require("fs");for(const l of fs.readFileSync(".env","utf8").split(/\r?\n/)){const m=l.match(/^\s*PIPELINE_API_KEY\s*=\s*(.*)\s*$/);if(m){process.stdout.write(m[1].replace(/^["\x27]|["\x27]$/g,""))}}')
IFS=',' read -ra K <<< "$KEYS"; n=${#K[@]}
slice(){ local s=$1 e=$2 out=""; for ((i=s;i<e&&i<n;i++)); do out="$out,${K[i]}"; done; echo "${out#,}"; }
half=$(( (n+1)/2 ))
A=$(slice 0 $half); B=$(slice $half $n)

audit_one(){  # ks in slug
  local ks="$1" in="$2" slug="$3"
  for i in $(seq 1 25); do
    local total=$(node -e "try{console.log(require('./$in').length)}catch{console.log(0)}" 2>/dev/null)
    local done=$(node -e "try{console.log(Object.keys(require('./pipeline/verify_report_${slug}.json')).length)}catch{console.log(0)}" 2>/dev/null)
    if [ "$total" -gt 0 ] && [ "$done" -ge "$total" ]; then echo "[$(ts)] ✓ $slug DONE ($done/$total)"; return 0; fi
    echo "[$(ts)] ▶ $slug iter $i: $done/$total ..."
    PIPELINE_API_KEY="$ks" node pipeline/verify-bank.mjs --in "$in" --slug "$slug" --batch 4 > "pipeline/_audit_${slug}.log" 2>&1
  done
  echo "[$(ts)] ⚠ $slug 25 iter tugadi"
}

echo "[$(ts)] ===== MTT2 AUDIT FAZA-A (mut, $n kalit, $half/$((n-half))) ====="
audit_one "$A" fan/mtt_tarbiyachi/gen_mut.json mtt_tarbiyachi_mut &
audit_one "$B" fan/mtt_rahbar/gen_mut.json     mtt_rahbar_mut &
wait
echo "[$(ts)] ===== MTT2 AUDIT FAZA-B (pedkasb) ====="
audit_one "$A" fan/mtt_tarbiyachi/gen_pedkasb.json mtt_tarbiyachi_pk &
audit_one "$B" fan/mtt_rahbar/gen_pedkasb.json     mtt_rahbar_pk &
wait
echo "[$(ts)] ===== MTT2 AUDIT TUGADI ====="
for s in mtt_tarbiyachi_mut mtt_rahbar_mut mtt_tarbiyachi_pk mtt_rahbar_pk; do
  echo "  $s: $(node -e "try{const r=require('./pipeline/verify_report_${s}.json');console.log(Object.keys(r).length+' tekshirildi, '+Object.values(r).filter(v=>v.verdict==='SHUBHALI').length+' shubhali')}catch{console.log('yo\x27q')}" 2>/dev/null)"
done
