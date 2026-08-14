#!/bin/bash
# MTT jismoniy tarbiya — TO'LDIRISH yurishi (2026-08-14).
# LLM-hakam auditi 577 savolni rad etgach, ayrim bo'limlar rasmiy og'irlikdan past qoldi.
# Balans "eng siqilgan bo'lim" bo'yicha hisoblangani uchun butun bank shu bo'limga tortiladi —
# demak faqat KAMCHIL bo'limlar to'ldiriladi.
#   lane 1: yengil atletika (13) + suzish (18)  → bo'laklar 14–21
#   lane 2: sport o'yinlari + inshootlar        → bo'laklar 22–35
#   lane 3: kasb standarti — ALOHIDA MTT manbasidan (SHARED_PED da atigi 3 bo'lak bor edi va
#           u umumta'lim maktabi konteksida; MTT kasbiy standarti bo'yicha yangi 8 bo'lakli
#           manba yozildi: scratch/mtt_jismoniy_kasb_spec.txt)
# Dedup: run-api ishga tushganda fan/mtt_jismoniy/gen*.json ni indeksga oladi → takror bo'lmaydi.
cd "C:/Users/User/Desktop/Toifa Pro PLATFORMA" || exit 1
ts(){ date "+%H:%M:%S"; }
cnt(){ node -e "try{console.log(require('./$1').length)}catch{console.log(0)}" 2>/dev/null || echo 0; }

KEYS=$(node -e 'const fs=require("fs");for(const l of fs.readFileSync(".env","utf8").split(/\r?\n/)){const m=l.match(/^\s*PIPELINE_API_KEY\s*=\s*(.*)\s*$/);if(m){process.stdout.write(m[1].replace(/^["\x27]|["\x27]$/g,""))}}')
IFS=',' read -ra K <<< "$KEYS"; n=${#K[@]}
slice(){ local s=$1 e=$2 out=""; for ((i=s;i<e&&i<n;i++)); do out="$out,${K[i]}"; done; echo "${out#,}"; }
t=$(( n/3 ))
K1=$(slice 0 $t); K2=$(slice $t $((2*t))); K3=$(slice $((2*t)) $n)

run_block(){   # kalitlar maqsad chiqish qoshimcha yorliq
  local ks="$1" target="$2" out="$3" extra="$4" label="$5"
  local prev=-1 c
  for i in $(seq 1 60); do
    c=$(cnt "$out")
    if [ "$c" -ge "$target" ]; then echo "[$(ts)] ✓ $label DONE $c/$target"; return 0; fi
    if [ "$i" -gt 2 ] && [ "$c" -le "$prev" ]; then echo "[$(ts)] ◼ $label STALL $c/$target (manba shifti)"; return 0; fi
    prev=$c
    echo "[$(ts)] ▶ $label iter $i: $c/$target ..."
    PIPELINE_API_KEY="$ks" node pipeline/run-api.mjs --subject mtt_jismoniy --blocks mutaxassislik \
      --target "$target" --out "$out" --per 12 $extra 2>&1 | tail -2
  done
  echo "[$(ts)] ⚠ $label 60 iter tugadi"
}

echo "[$(ts)] ===== MTTJT TO'LDIRISH START ($n kalit → 3 lane) ====="
run_block "$K1" 320 fan/mtt_jismoniy/gen_top_atl.json  "--offset 13 --limit 8"                              "TOP-ATL+SUZISH" &
run_block "$K2" 320 fan/mtt_jismoniy/gen_top_oyin.json "--offset 21 --limit 14"                             "TOP-OYIN+INSH"  &
run_block "$K3" 300 fan/mtt_jismoniy/gen_top_kasb.json "--source scratch/mtt_jismoniy_kasb_spec.txt"        "TOP-KASB"       &
wait
echo "[$(ts)] ===== TO'LDIRISH TUGADI ====="
echo "atl=$(cnt fan/mtt_jismoniy/gen_top_atl.json) oyin=$(cnt fan/mtt_jismoniy/gen_top_oyin.json) kasb=$(cnt fan/mtt_jismoniy/gen_top_kasb.json)"
