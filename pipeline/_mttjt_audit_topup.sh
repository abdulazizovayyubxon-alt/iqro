#!/bin/bash
# MTT jismoniy tarbiya — TO'LDIRISH yurishi savollarining LLM-hakam auditi.
cd "C:/Users/User/Desktop/Toifa Pro PLATFORMA" || exit 1
ts(){ date "+%H:%M:%S"; }
KEYS=$(node -e 'const fs=require("fs");for(const l of fs.readFileSync(".env","utf8").split(/\r?\n/)){const m=l.match(/^\s*PIPELINE_API_KEY\s*=\s*(.*)\s*$/);if(m){process.stdout.write(m[1].replace(/^["\x27]|["\x27]$/g,""))}}')
IFS=',' read -ra K <<< "$KEYS"; n=${#K[@]}
slice(){ local s=$1 e=$2 out=""; for ((i=s;i<e&&i<n;i++)); do out="$out,${K[i]}"; done; echo "${out#,}"; }
t=$(( n/3 ))
K1=$(slice 0 $t); K2=$(slice $t $((2*t))); K3=$(slice $((2*t)) $n)

audit_one(){  # kalitlar kirish slug
  local ks="$1" in="$2" slug="$3"
  [ -f "$in" ] || { echo "[$(ts)] — $slug: kirish fayli yo'q"; return 0; }
  for i in $(seq 1 25); do
    local total=$(node -e "try{console.log(require('./$in').length)}catch{console.log(0)}" 2>/dev/null)
    local done=$(node -e "try{console.log(Object.keys(require('./pipeline/verify_report_${slug}.json')).length)}catch{console.log(0)}" 2>/dev/null)
    if [ "$total" -gt 0 ] && [ "$done" -ge "$total" ]; then echo "[$(ts)] ✓ $slug DONE ($done/$total)"; return 0; fi
    echo "[$(ts)] ▶ $slug iter $i: $done/$total ..."
    PIPELINE_API_KEY="$ks" node pipeline/verify-bank.mjs --in "$in" --slug "$slug" --batch 4 > "pipeline/_audit_${slug}.log" 2>&1
  done
}

echo "[$(ts)] ===== TO'LDIRISH AUDITI START ====="
audit_one "$K1" fan/mtt_jismoniy/gen_top_atl.json  mttjt_top_atl  &
audit_one "$K2" fan/mtt_jismoniy/gen_top_oyin.json mttjt_top_oyin &
audit_one "$K3" fan/mtt_jismoniy/gen_top_kasb.json mttjt_top_kasb &
wait
echo "[$(ts)] ===== TO'LDIRISH AUDITI TUGADI ====="
for s in mttjt_top_atl mttjt_top_oyin mttjt_top_kasb; do
  echo "  $s: $(node -e "try{const r=require('./pipeline/verify_report_${s}.json');console.log(Object.keys(r).length+' tekshirildi, '+Object.values(r).filter(v=>v.verdict==='SHUBHALI').length+' shubhali')}catch{console.log('yo\x27q')}" 2>/dev/null)"
done
