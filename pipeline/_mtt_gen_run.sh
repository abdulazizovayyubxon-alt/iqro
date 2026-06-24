#!/bin/bash
# MTT psixolog + logoped — avtomatik generatsiya orkestratori (2026-06-23).
# Har blok: stall-detect bilan run-api'ni target yoki tabiiy shiftgacha aylantiradi.
# O'lsa/qayta ishga tushsa — gen_*.json dan DAVOM etadi (resume). Tugagan bloklar darrov DONE.
cd "C:/Users/User/Desktop/CHQBT PLATFORMA" || exit 1
ts(){ date "+%H:%M:%S"; }
cnt(){ node -e "try{console.log(require('./$1').length)}catch{console.log(0)}" 2>/dev/null || echo 0; }

run_block(){
  local slug="$1" blocks="$2" target="$3" out="$4" extra="$5"
  local prev=-1 c
  for i in $(seq 1 80); do
    c=$(cnt "$out")
    if [ "$c" -ge "$target" ]; then echo "[$(ts)] ✓ $slug/$blocks DONE $c/$target"; return 0; fi
    if [ "$i" -gt 1 ] && [ "$c" -le "$prev" ]; then echo "[$(ts)] ◼ $slug/$blocks STALL $c/$target (manba shifti — to'xtatildi)"; return 0; fi
    prev=$c
    echo "[$(ts)] ▶ $slug/$blocks iter $i: $c/$target ..."
    node pipeline/run-api.mjs --subject "$slug" --blocks "$blocks" --target "$target" --out "$out" $extra 2>&1 | tail -4
  done
  echo "[$(ts)] ⚠ $slug/$blocks 80 iter tugadi (target yetmadi)"
}

echo "[$(ts)] ===== MTT GEN START (psixolog + logoped) ====="
run_block mtt_psixolog mutaxassislik   2300 fan/mtt_psixolog/gen_mut.json     ""
run_block mtt_psixolog pedagogika,kasb 600  fan/mtt_psixolog/gen_pedkasb.json "--ped-style framed"
run_block mtt_logoped  mutaxassislik   2300 fan/mtt_logoped/gen_mut.json      ""
run_block mtt_logoped  pedagogika,kasb 600  fan/mtt_logoped/gen_pedkasb.json  "--ped-style framed"
echo "[$(ts)] ===== HAMMA GEN TUGADI ====="
echo "psixolog: mut=$(cnt fan/mtt_psixolog/gen_mut.json) pedkasb=$(cnt fan/mtt_psixolog/gen_pedkasb.json)"
echo "logoped:  mut=$(cnt fan/mtt_logoped/gen_mut.json) pedkasb=$(cnt fan/mtt_logoped/gen_pedkasb.json)"
