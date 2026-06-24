#!/bin/bash
# MTT tarbiyachi + rahbar — avtomatik generatsiya orkestratori (2026-06-23).
# 2 PARALLEL lane (har fan bitta lane), kalitlar bo'lingan (herd/429 yo'q). run-api SERIAL (1 call → delay → kalit rotatsiya),
# shuning uchun parallellik = ko'p PROTSESS. Har lane: mut (2300) keyin pedkasb (600), ALOHIDA. Stall-detect + resume (gen_*.json).
# SLEEP YO'Q (sleep fon protsessni o'ldiradi — memory saboq).
cd "C:/Users/User/Desktop/CHQBT PLATFORMA" || exit 1
ts(){ date "+%H:%M:%S"; }
cnt(){ node -e "try{console.log(require('./$1').length)}catch{console.log(0)}" 2>/dev/null || echo 0; }

KEYS=$(node -e 'const fs=require("fs");for(const l of fs.readFileSync(".env","utf8").split(/\r?\n/)){const m=l.match(/^\s*PIPELINE_API_KEY\s*=\s*(.*)\s*$/);if(m){process.stdout.write(m[1].replace(/^["\x27]|["\x27]$/g,""))}}')
IFS=',' read -ra K <<< "$KEYS"; n=${#K[@]}
slice(){ local s=$1 e=$2 out=""; for ((i=s;i<e&&i<n;i++)); do out="$out,${K[i]}"; done; echo "${out#,}"; }
half=$(( (n+1)/2 ))
TAR=$(slice 0 $half)         # tarbiyachi: 1-yarmi (~14 kalit)
RAH=$(slice $half $n)        # rahbar: 2-yarmi (~13 kalit)

run_block(){
  local ks="$1" slug="$2" blocks="$3" target="$4" out="$5" extra="$6"
  local prev=-1 c
  for i in $(seq 1 80); do
    c=$(cnt "$out")
    if [ "$c" -ge "$target" ]; then echo "[$(ts)] ✓ $slug/$blocks DONE $c/$target"; return 0; fi
    if [ "$i" -gt 1 ] && [ "$c" -le "$prev" ]; then echo "[$(ts)] ◼ $slug/$blocks STALL $c/$target (manba shifti)"; return 0; fi
    prev=$c
    echo "[$(ts)] ▶ $slug/$blocks iter $i: $c/$target ..."
    PIPELINE_API_KEY="$ks" node pipeline/run-api.mjs --subject "$slug" --blocks "$blocks" --target "$target" --out "$out" $extra 2>&1 | tail -3
  done
  echo "[$(ts)] ⚠ $slug/$blocks 80 iter tugadi"
}

lane(){   # bitta fan to'liq: mutaxassislik keyin ped/kasb
  local ks="$1" slug="$2"
  run_block "$ks" "$slug" mutaxassislik   2300 fan/$slug/gen_mut.json     ""
  run_block "$ks" "$slug" pedagogika,kasb 600  fan/$slug/gen_pedkasb.json "--ped-style framed"
  echo "[$(ts)] ★ $slug LANE TUGADI: mut=$(cnt fan/$slug/gen_mut.json) pedkasb=$(cnt fan/$slug/gen_pedkasb.json)"
}

echo "[$(ts)] ===== MTT2 GEN START (tarbiyachi||rahbar, $n kalit, lane=$half/$((n-half))) ====="
lane "$TAR" mtt_tarbiyachi &
lane "$RAH" mtt_rahbar &
wait
echo "[$(ts)] ===== HAMMA GEN TUGADI ====="
echo "tarbiyachi: mut=$(cnt fan/mtt_tarbiyachi/gen_mut.json) pedkasb=$(cnt fan/mtt_tarbiyachi/gen_pedkasb.json)"
echo "rahbar:     mut=$(cnt fan/mtt_rahbar/gen_mut.json) pedkasb=$(cnt fan/mtt_rahbar/gen_pedkasb.json)"
