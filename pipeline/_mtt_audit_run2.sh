#!/bin/bash
# MTT audit FAZA-2: faqat qolgan 2 mutaxassislik fayli. Ped tugadi → kalitlar bo'shadi.
# logoped (laggard) ko'proq kalit oladi. Ikkalasi report'dan RESUME (429-skip bo'lganlar qayta tekshiriladi).
cd "C:/Users/User/Desktop/CHQBT PLATFORMA" || exit 1
ts(){ date "+%H:%M:%S"; }
KEYS=$(node -e 'const fs=require("fs");for(const l of fs.readFileSync(".env","utf8").split(/\r?\n/)){const m=l.match(/^\s*PIPELINE_API_KEY\s*=\s*(.*)\s*$/);if(m){process.stdout.write(m[1].replace(/^["\x27]|["\x27]$/g,""))}}')
IFS=',' read -ra K <<< "$KEYS"; n=${#K[@]}
slice(){ local s=$1 e=$2 out=""; for ((i=s;i<e&&i<n;i++)); do out="$out,${K[i]}"; done; echo "${out#,}"; }
PSI=$(slice 0 9)    # psixolog mut: 9 kalit (deyarli tugagan)
LOG=$(slice 9 27)   # logoped mut: 18 kalit (laggard — kuch shu yerga)

audit_one(){
  local ks="$1" in="$2" slug="$3" log="$4"
  for i in $(seq 1 15); do
    PIPELINE_API_KEY="$ks" node pipeline/verify-bank.mjs --in "$in" --slug "$slug" --batch 4 > "$log" 2>&1
    local done=$(node -e "try{const r=require('./pipeline/verify_report_${slug}.json');const d=require('./$in');console.log(Object.keys(r).length>=d.length?1:0)}catch{console.log(0)}" 2>/dev/null)
    if [ "$done" = "1" ]; then
      local fl=$(node -e "const r=require('./pipeline/verify_report_${slug}.json');console.log(Object.values(r).filter(v=>v.verdict==='SHUBHALI').length)" 2>/dev/null)
      echo "[$(ts)] ✓ $slug AUDIT DONE — shubhali: $fl"; return
    fi
    echo "[$(ts)] $slug qisman ($(node -e "try{console.log(Object.keys(require('./pipeline/verify_report_${slug}.json')).length)}catch{console.log(0)}")), qayta $i ..."
  done
}

echo "[$(ts)] ===== AUDIT FAZA-2 START (psixolog 9 kalit, logoped 18 kalit) ====="
audit_one "$PSI" fan/mtt_psixolog/gen_mut.json mtt_psixolog pipeline/_audit_psi_mut.log &
audit_one "$LOG" fan/mtt_logoped/gen_mut.json  mtt_logoped  pipeline/_audit_log_mut.log &
wait
echo "[$(ts)] ===== FAZA-2 TUGADI ====="
for s in mtt_psixolog mtt_logoped; do
  echo "  $s: $(node -e "const r=require('./pipeline/verify_report_${s}.json');console.log(Object.keys(r).length+' tekshirildi, '+Object.values(r).filter(v=>v.verdict==='SHUBHALI').length+' shubhali')" 2>/dev/null)"
done
