#!/bin/bash
# MTT psixolog + logoped — 4 bankni PARALLEL LLM-audit (verify-bank). Kalitlar 4 bo'lakka bo'lingan (herd yo'q).
# Har audit checkpoint bilan resume; qisman qolsa retry. Report: pipeline/verify_report_<slug>.json
cd "C:/Users/User/Desktop/CHQBT PLATFORMA" || exit 1
ts(){ date "+%H:%M:%S"; }
KEYS=$(node -e 'const fs=require("fs");for(const l of fs.readFileSync(".env","utf8").split(/\r?\n/)){const m=l.match(/^\s*PIPELINE_API_KEY\s*=\s*(.*)\s*$/);if(m){process.stdout.write(m[1].replace(/^["\x27]|["\x27]$/g,""))}}')
IFS=',' read -ra K <<< "$KEYS"; n=${#K[@]}
slice(){ local s=$1 e=$2 out=""; for ((i=s;i<e&&i<n;i++)); do out="$out,${K[i]}"; done; echo "${out#,}"; }
S1=$(slice 0 7); S2=$(slice 7 14); S3=$(slice 14 21); S4=$(slice 21 27)

audit_one(){
  local ks="$1" in="$2" slug="$3" log="$4"
  for i in $(seq 1 12); do
    PIPELINE_API_KEY="$ks" node pipeline/verify-bank.mjs --in "$in" --slug "$slug" > "$log" 2>&1
    local done=$(node -e "try{const r=require('./pipeline/verify_report_${slug}.json');const d=require('./$in');console.log(Object.keys(r).length>=d.length?1:0)}catch{console.log(0)}" 2>/dev/null)
    if [ "$done" = "1" ]; then
      local fl=$(node -e "const r=require('./pipeline/verify_report_${slug}.json');console.log(Object.values(r).filter(v=>v.verdict==='SHUBHALI').length)" 2>/dev/null)
      echo "[$(ts)] ✓ $slug AUDIT DONE — shubhali: $fl"; return
    fi
    echo "[$(ts)] $slug qisman, qayta urinish $i ..."
  done
  echo "[$(ts)] ⚠ $slug 12 urinish tugadi"
}

echo "[$(ts)] ===== MTT AUDIT START (4 parallel, kalit 7/7/7/6) ====="
audit_one "$S1" fan/mtt_psixolog/gen_mut.json     mtt_psixolog         pipeline/_audit_psi_mut.log &
audit_one "$S2" fan/mtt_psixolog/gen_pedkasb.json mtt_psixolog_pedkasb pipeline/_audit_psi_pk.log  &
audit_one "$S3" fan/mtt_logoped/gen_mut.json      mtt_logoped          pipeline/_audit_log_mut.log &
audit_one "$S4" fan/mtt_logoped/gen_pedkasb.json  mtt_logoped_pedkasb  pipeline/_audit_log_pk.log  &
wait
echo "[$(ts)] ===== HAMMA AUDIT TUGADI ====="
for s in mtt_psixolog mtt_psixolog_pedkasb mtt_logoped mtt_logoped_pedkasb; do
  c=$(node -e "try{const r=require('./pipeline/verify_report_${s}.json');console.log(Object.keys(r).length+' tekshirildi, '+Object.values(r).filter(v=>v.verdict==='SHUBHALI').length+' shubhali')}catch{console.log('YO\x27Q')}" 2>/dev/null)
  echo "  $s: $c"
done
