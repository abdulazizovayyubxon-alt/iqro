#!/bin/bash
# MTT jismoniy tarbiya — LLM-hakam auditi. verify-bank SERIAL (kalit faqat 429-rotatsiya),
# shuning uchun parallellik = ko'p PROTSESS + kalit-slice. 3 lane fayli 3 parallel audit.
# Report slug ALOHIDA (resume + checkpoint verify-bank ichida).
cd "C:/Users/User/Desktop/Toifa Pro PLATFORMA" || exit 1
ts(){ date "+%H:%M:%S"; }
KEYS=$(node -e 'const fs=require("fs");for(const l of fs.readFileSync(".env","utf8").split(/\r?\n/)){const m=l.match(/^\s*PIPELINE_API_KEY\s*=\s*(.*)\s*$/);if(m){process.stdout.write(m[1].replace(/^["\x27]|["\x27]$/g,""))}}')
IFS=',' read -ra K <<< "$KEYS"; n=${#K[@]}
slice(){ local s=$1 e=$2 out=""; for ((i=s;i<e&&i<n;i++)); do out="$out,${K[i]}"; done; echo "${out#,}"; }
t=$(( n/3 ))
K1=$(slice 0 $t); K2=$(slice $t $((2*t))); K3=$(slice $((2*t)) $n)

audit_one(){  # kalitlar kirish slug
  local ks="$1" in="$2" slug="$3"
  for i in $(seq 1 30); do
    local total=$(node -e "try{console.log(require('./$in').length)}catch{console.log(0)}" 2>/dev/null)
    local done=$(node -e "try{console.log(Object.keys(require('./pipeline/verify_report_${slug}.json')).length)}catch{console.log(0)}" 2>/dev/null)
    if [ "$total" -gt 0 ] && [ "$done" -ge "$total" ]; then echo "[$(ts)] ✓ $slug DONE ($done/$total)"; return 0; fi
    echo "[$(ts)] ▶ $slug iter $i: $done/$total ..."
    PIPELINE_API_KEY="$ks" node pipeline/verify-bank.mjs --in "$in" --slug "$slug" --batch 4 > "pipeline/_audit_${slug}.log" 2>&1
  done
  echo "[$(ts)] ⚠ $slug 30 iter tugadi"
}

echo "[$(ts)] ===== MTTJT AUDIT START ($n kalit → 3 lane) ====="
audit_one "$K1" fan/mtt_jismoniy/gen_mut_a.json   mttjt_mut_a &
audit_one "$K2" fan/mtt_jismoniy/gen_mut_b.json   mttjt_mut_b &
audit_one "$K3" fan/mtt_jismoniy/gen_pedkasb.json mttjt_pk    &
wait
echo "[$(ts)] ===== MTTJT AUDIT TUGADI ====="
for s in mttjt_mut_a mttjt_mut_b mttjt_pk; do
  echo "  $s: $(node -e "try{const r=require('./pipeline/verify_report_${s}.json');console.log(Object.keys(r).length+' tekshirildi, '+Object.values(r).filter(v=>v.verdict==='SHUBHALI').length+' shubhali')}catch{console.log('yo\x27q')}" 2>/dev/null)"
done
