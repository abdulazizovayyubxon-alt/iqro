# Savol Fabrikasi

Bepul, kalitsiz, ommaviy va sifatli test savoli generatsiyasi. Og'ir ish (manba
bo'laklash, dedup, validatsiya, aralashtirish, birlashtirish) **lokalda, bepul** bajariladi.
LLM faqat savol matnini yozadi — buni **bepul web LLM** (gemini.google.com,
chat.deepseek.com, chat.qwen.ai) orqali nusxa-joylashtirib hal qilamiz.

## Nega kerak (diagnoz)

`fan/<fan>/` da har fanda ~3000 "savol" bor edi (jami 24 000), lekin semantik tahlil
ko'rsatdi: faqat **~4% haqiqiy noyob**, qolgani `#KS1784` teg bilan ko'paytirilgan
**padding** (yaqin-takror). Maqsad: har fanga **~2000 ta HAQIQIY noyob**, namuna
uslubidan/manbadan chiqmaydigan savol.

## Kafolatlar
- **Dublikatsiz:** trigram yaqin-dublikat (≥0.82) butun korpusga qarshi tekshiriladi.
- **Manbadan chiqmaydi:** prompt faqat spec + namuna doirasida; `source_construct` majburiy.
- **Lotin imlo:** krill aralashgan savol avtomat rad etiladi.
- **Javob shablonsiz:** to'g'ri javob A/B/C/D bo'ylab avtomat aralashtiriladi.
- **3 blok:** mutaxassislik (fan spec) + pedagogik mahorat + kasb standartlari (umumiy manba).
- **3 format:** single, matching (moslashtirish), sequence (ketma-ketlik).

## Ish tartibi (kalitsiz)

### 0. Tozalash (bir marta) — padded korpusdan noyoblarni ajratish
```
node pipeline/dedupe-corpus.mjs            # hisobot
node pipeline/dedupe-corpus.mjs --write    # fan/<fan>/_clean.json yozadi
```

### 1. Namuna → langar (bir marta, fan bo'yicha)
```
node pipeline/transcribe-namuna.mjs --subject biologiya
```
→ `pipeline/prompts/biologiya/_namuna_guide.md` qo'llanmasiga amal qiling: rasmlar +
promptни **multimodal** web LLM (Gemini/Qwen) ga tashlang → JSON javobni
`pipeline/inbox/biologiya/namuna_01.json` ga saqlang →
```
node pipeline/ingest.mjs --subject biologiya --as-namuna
```

### 2. Generatsiya (asosiy, takrorlanuvchi)
```
node pipeline/make-prompts.mjs --subject biologiya --per 15
```
→ `pipeline/prompts/biologiya/NNN_*.txt` har birini web LLM'ga joylashtiring →
JSON javobni `pipeline/inbox/biologiya/NNN.json` ga saqlang →
```
node pipeline/ingest.mjs --subject biologiya
```
Hisobot: qabul / takror / yaroqsiz. Maqsadga (2000) yetguncha takrorlang.

### 3. Tekshirish va integratsiya
```
node pipeline/report.mjs --subject biologiya     # noyob%, sxema, balans, taqsimot
node pipeline/report.mjs --all                   # barcha fanlar
node pipeline/to-app.mjs --subject biologiya     # ilova formatiga (_app.json)
```

## (Ixtiyoriy) to'liq avtomat — kalit topilsa
`.env` ga `PIPELINE_API_BASE`, `PIPELINE_API_KEY`, `PIPELINE_API_MODEL` qo'shing:
```
node pipeline/run-api.mjs --subject biologiya --per 15
```

## Promptni tahrirlash
Erkin o'zgartiring (avtomat kuchga kiradi):
- `pipeline/templates/gen_prompt.txt` — savol generatsiya qoidalari
- `pipeline/templates/namuna_prompt.txt` — namuna rasmni JSONga o'tkazish

`{{SUBJECT}} {{TOPIC}} {{COUNT}} {{BLOCK}} {{SPEC}} {{ANCHORS}} {{EXISTING}}` — avtomat to'ldiriladi.

## Tuzilish
```
pipeline/
  lib/        normalize, schema, dedup, corpus, chunk, prompt, shuffle, subjects
  templates/  gen_prompt.txt, namuna_prompt.txt
  prompts/<fan>/   tayyor promptlar (web LLM uchun)
  inbox/<fan>/     web LLM javoblari (siz saqlaysiz)
  rejected/        rad etilgan savollar (sabab bilan)
  dedupe-corpus / transcribe-namuna / make-prompts / ingest / report / to-app / run-api .mjs
fan/<fan>/
  _clean.json   tozalangan noyoblar
  _namuna.json  namuna langar
  gen_*.json    generatsiya natijasi
  _app.json     ilova formati
```

## 15 qiloqchi (fan)
chqbt, art, tarix, boshlangich, informatika, jismoniy_tarbiya, mtt_tarbiyachi,
mtt_rahbar, nemis, ona_tili, biologiya, geografiya, ingliz, mtt_logoped, mtt_psixolog.
(Ro'yxat: `pipeline/lib/subjects.mjs`)
