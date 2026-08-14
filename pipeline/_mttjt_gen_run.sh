#!/bin/bash
# MTT jismoniy tarbiya yo'riqchisi — avtomatik generatsiya orkestratori (2026-08-14).
# 3 PARALLEL lane, kalitlar 3 ga bo'lingan (herd/429 yo'q). run-api SERIAL (1 call → delay → kalit
# rotatsiya), shuning uchun parallellik = ko'p PROTSESS.
#   lane 1: mutaxassislik bo'laklari 1–18  (valeologiya, gimnastika, harakatli o'yinlar, yengil atletika)
#   lane 2: mutaxassislik bo'laklari 19–35 (suzish, sport o'yinlari, sport inshootlari)
#   lane 3: pedagogika + kasb (SHARED_PED manbasi)
# Stall-detect + resume (gen_*.json saqlanadi, uzilsa o'sha joydan davom etadi). SLEEP YO'Q.
cd "C:/Users/User/Desktop/Toifa Pro PLATFORMA" || exit 1
ts(){ date "+%H:%M:%S"; }
cnt(){ node -e "try{console.log(require('./$1').length)}catch{console.log(0)}" 2>/dev/null || echo 0; }

KEYS=$(node -e 'const fs=require("fs");for(const l of fs.readFileSync(".env","utf8").split(/\r?\n/)){const m=l.match(/^\s*PIPELINE_API_KEY\s*=\s*(.*)\s*$/);if(m){process.stdout.write(m[1].replace(/^["\x27]|["\x27]$/g,""))}}')
IFS=',' read -ra K <<< "$KEYS"; n=${#K[@]}
slice(){ local s=$1 e=$2 out=""; for ((i=s;i<e&&i<n;i++)); do out="$out,${K[i]}"; done; echo "${out#,}"; }
t=$(( n/3 ))
K1=$(slice 0 $t); K2=$(slice $t $((2*t))); K3=$(slice $((2*t)) $n)

run_block(){   # kalitlar slug bloklar maqsad chiqish qoshimcha
  local ks="$1" blocks="$2" target="$3" out="$4" extra="$5" label="$6"
  local prev=-1 c
  for i in $(seq 1 120); do
    c=$(cnt "$out")
    if [ "$c" -ge "$target" ]; then echo "[$(ts)] ✓ $label DONE $c/$target"; return 0; fi
    if [ "$i" -gt 2 ] && [ "$c" -le "$prev" ]; then echo "[$(ts)] ◼ $label STALL $c/$target (manba shifti)"; return 0; fi
    prev=$c
    echo "[$(ts)] ▶ $label iter $i: $c/$target ..."
    PIPELINE_API_KEY="$ks" node pipeline/run-api.mjs --subject mtt_jismoniy --blocks "$blocks" \
      --target "$target" --out "$out" --per 12 $extra 2>&1 | tail -2
  done
  echo "[$(ts)] ⚠ $label 120 iter tugadi"
}

mkdir -p fan/mtt_jismoniy
echo "[$(ts)] ===== MTT JISMONIY GEN START ($n kalit → 3 lane: ${t}/${t}/$((n-2*t))) ====="
run_block "$K1" mutaxassislik   1100 fan/mtt_jismoniy/gen_mut_a.json "--limit 18"            "MUT-A(1-18)"   &
run_block "$K2" mutaxassislik   1100 fan/mtt_jismoniy/gen_mut_b.json "--offset 18"           "MUT-B(19-35)"  &
run_block "$K3" pedagogika,kasb 750  fan/mtt_jismoniy/gen_pedkasb.json "--ped-style framed"  "PED+KASB"      &
wait
echo "[$(ts)] ===== HAMMA GEN TUGADI ====="
echo "mut-a=$(cnt fan/mtt_jismoniy/gen_mut_a.json) mut-b=$(cnt fan/mtt_jismoniy/gen_mut_b.json) pedkasb=$(cnt fan/mtt_jismoniy/gen_pedkasb.json)"
