#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// fix-typos-dict.mjs — Deterministik (LLM'siz) imlo tuzatuvchi.
//
// Faqat QO'LDA TASDIQLANGAN, 100% bexatar imlo-juftliklarini so'z-chegara
// (word-boundary) bo'yicha almashtiradi. Registr saqlanadi (Gramatik→
// Grammatik). O'zbek qo'shimchalari uchun so'z-BOSHIDAN moslashtiradi
// (\bgramatik → grammatik: gramatika, gramatikaga ham tuzatiladi).
//
// XAVFSIZLIK QO'RIQLAGICHLARI:
//   • Agar tuzatishdan keyin ikki variant bir xil bo'lib qolsa (imlo-savoli
//     distraktorini yutib yuborgan bo'lishi mumkin) — o'sha savol O'TKAZILADI.
//   • Savol o'zagi imlo-savoliga o'xshasa (imlo/to'g'ri yozilgan/xato
//     yozilgan/qaysi so'z...) va variant o'zgarsa — O'TKAZILADI, hisobotga.
//   • correct/topicId/category maydonlariga TEGILMAYDI.
//   • Yozishdan oldin to'liq zaxira dump saqlanadi.
//
// FOYDALANISH:
//   node scripts/fix-typos-dict.mjs til --dry-run   # ko'rsatadi, yozmaydi
//   node scripts/fix-typos-dict.mjs til             # JONLI: Firestore yoziladi
// ════════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

// ── Tasdiqlangan lug'at: [xato_o'zak, to'g'ri_o'zak] (so'z-boshidan, registrsiz) ──
// Bu ro'yxatga faqat 100% bexatar (hech qachon to'g'ri bo'lmaydigan) so'zlar qo'shiladi.
const DICT = [
  // — qo'sh-undosh (til skaneri topgan) —
  ['gramatik', 'grammatik'],      // gramatika, gramatikaga ham
  ['tayorgarlik', 'tayyorgarlik'],
  ['modiy', 'moddiy'],
  // — chqbt skaneri topgan (vetdan o'tgan; soxta-pozitivlar rad etildi) —
  ['imobilizatsiya', 'immobilizatsiya'],  // tibbiy termin, hech qachon ambiguity yo'q
  ['metal', 'metall'],                     // superset — buildRe lookahead "metall"ni himoya qiladi; art/musiqa "heavy metal" dry-run'da ko'rilsin
  ['mudofa', 'mudofaa'],                   // superset — lookahead "mudofaa"ni himoya qiladi
  // — ma'lum x/h va boshqa imlo xatolari (boshqa fanlarda uchraydi) —
  ['ximoya', 'himoya'], ['xarbiy', 'harbiy'], ['fukaro', 'fuqaro'], ['fuqoro', 'fuqaro'],
  ['muxim', 'muhim'], ['xujjat', 'hujjat'], ['xuquq', 'huquq'], ['xukumat', 'hukumat'],
  ['shaxar', 'shahar'], ['raxbar', 'rahbar'], ['jaroxat', 'jarohat'],
  ['konstututsiya', 'konstitutsiya'],
  // — tarix skaneri topgan (vetdan o'tgan; qatiq→qattiq RAD — "qatiq" ovqat) —
  ['somoniyollar', 'somoniylar'], ['somoniyolar', 'somoniylar'], // sulola nomi — 63 savol
  ['budizm', 'buddizm'], ['renesans', 'renessans'], ['samarqanda', 'samarqandda'],
  ['omaviy', 'ommaviy'], ['egalash', 'egallash'], ['itifoqi', 'ittifoqi'],
  ['hamurapi', 'hammurapi'],
  // — art skaneri topgan (vetdan o'tgan; qatiq→qattiq RAD; metal=material, "heavy metal" YO'Q) —
  ['detalar', 'detallar'],  // detal+lar (detalarning/detalarni/detalarga)
  ['komunikativ', 'kommunikativ'],
  ['kontast', 'kontrast'],  // LLM #1266 da "qo'shni"→"kontast" xato kiritgan; to'g'risi kontrast
  // — info skaneri topgan (matni→matnni RAD: izafat "matni" ≠ tushum "matnni") —
  ['ikilik', 'ikkilik'], ['protsesor', 'protsessor'],
  // — geografiya skaneri (so'ngi→so'nggi RAD: "so'ngi"=uning so'ngi ham bo'ladi) —
  ['zonaligi', 'zonalligi'], ['hududa', 'hududda'],
  // — biologiya skaneri (qatiq→qattiq RAD: biologiyada "qatiq"=yogurt/sut mahsuloti!) —
  ['disimilyatsiya', 'dissimilyatsiya'], ['aferent', 'afferent'],
  ['ikala', 'ikkala'], ['avloda', 'avlodda'],
  // — boshlangich skaneri (matni/matning RAD: izafat/morfologik) —
  ['ikinchi', 'ikkinchi'],
];

const SPELLING_STEM = /(imlo|to'g'ri yozilgan|xato yozilgan|to‘g‘ri yozilgan|xato yozil|qaysi so'z|qaysi so‘z)/i;
const isUpper = (ch) => ch && ch === ch.toUpperCase() && ch !== ch.toLowerCase();

// So'z-boshidan moslashadi (o'zbek qo'shimchalarini ushlaydi). SUPERSET juftlik
// (to'g'ri so'z xato bilan boshlanadi, mas. metal⊂metall) uchun negativ-lookahead
// qo'shiladi — aks holda \bmetal "metall"ni ushlab "metalll" qilib buzardi.
function buildRe(bad, good) {
  const superset = good.toLowerCase().startsWith(bad.toLowerCase());
  const re = superset
    ? new RegExp(`\\b${bad}(?!${good[bad.length]})`, 'gi') // to'g'ri so'zni davom ettiruvchi harf kelmasa
    : new RegExp(`\\b${bad}`, 'gi');
  // O'Z-TEST: regex TO'G'RI so'z `good`ni hech qachon o'zgartirmasligi shart.
  const unsafe = re.test(good);
  re.lastIndex = 0;
  if (unsafe) throw new Error(`Xavfsiz emas lug'at juftligi: "${bad}"→"${good}" — to'g'ri so'zni buzadi, tool to'xtatildi`);
  return re;
}
const COMPILED = DICT.map(([bad, good]) => ({ good, re: buildRe(bad, good) }));

function applyDict(text) {
  if (typeof text !== 'string' || !text) return { out: text, changes: [] };
  let out = text;
  const changes = [];
  for (const { good, re } of COMPILED) {
    out = out.replace(re, (m) => {
      const g = isUpper(m[0]) ? good[0].toUpperCase() + good.slice(1) : good;
      changes.push(`${m}→${g}`);
      return g;
    });
  }
  return { out, changes };
}

async function main() {
  const fan = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');
  if (!fan) { console.error('Foydalanish: node scripts/fix-typos-dict.mjs <fan> [--dry-run]'); process.exit(1); }

  const app = initializeApp({
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
  console.log(`🔐 ${process.env.ADMIN_EMAIL} bilan Firestore'ga kirilmoqda...`);
  await signInWithEmailAndPassword(getAuth(app), process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  const db = getFirestore(app);
  const snap = await getDocs(query(collection(db, 'questions'), where('category', '==', fan)));
  const rows = [];
  snap.forEach((d) => rows.push({ id: d.id, data: d.data() }));
  console.log(`📄 category=${fan}: ${rows.length} savol | rejim: ${dryRun ? 'DRY-RUN' : 'JONLI'}\n`);
  if (!rows.length) { console.error('❌ Savol topilmadi'); process.exit(1); }

  const ts = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  if (!dryRun) {
    const bak = path.join('src', 'data', `firestore_backup_${fan}_typos_${ts}.json`);
    fs.writeFileSync(bak, JSON.stringify(rows.map((r) => ({ __docId: r.id, ...r.data })), null, 2));
    console.log(`💾 Zaxira: ${bak}\n`);
  }

  const updates = [];   // {id, fields, log}
  const skipped = [];   // {id, reason, log}
  for (const { id, data } of rows) {
    const fields = {};
    const log = [];
    let optionCollision = false, spellingRisk = false;

    const rq = applyDict(data.q);
    if (rq.changes.length) { fields.q = rq.out; log.push(`q: ${rq.changes.join(', ')}`); }

    if (Array.isArray(data.opts)) {
      const newOpts = [...data.opts];
      const optChanges = [];
      data.opts.forEach((o, k) => {
        const r = applyDict(o);
        if (r.changes.length) { newOpts[k] = r.out; optChanges.push(`opt[${k}]: ${r.changes.join(', ')}`); }
      });
      if (optChanges.length) {
        // Qo'riqlagich 1: dublikat variant paydo bo'ldimi?
        if (new Set(newOpts).size < newOpts.length) optionCollision = true;
        // Qo'riqlagich 2: imlo-savoli o'zagimi?
        if (SPELLING_STEM.test(data.q || '')) spellingRisk = true;
        if (!optionCollision && !spellingRisk) { fields.opts = newOpts; log.push(...optChanges); }
      }
    }

    const re = applyDict(data.explanation);
    if (re.changes.length) { fields.explanation = re.out; log.push(`explanation: ${re.changes.join(', ')}`); }

    if (optionCollision || spellingRisk) {
      skipped.push({ id, reason: optionCollision ? 'dublikat-variant xavfi' : 'imlo-savoli o\'zagi', log: log.length ? log : ['(variant o\'zgarishi)'] });
      // faqat opts'ni o'tkazamiz; q/explanation bexatar bo'lsa baribir qo'llansin
      delete fields.opts;
      if (Object.keys(fields).length) updates.push({ id, fields, log: log.filter((l) => !l.startsWith('opt')) });
      continue;
    }
    if (Object.keys(fields).length) updates.push({ id, fields, log });
  }

  console.log(`🔎 ${updates.length} savolda tuzatish topildi | ${skipped.length} savol qo'riqlagich bilan o'tkazildi\n`);
  for (const u of updates.slice(0, 80)) console.log(`  ✏️  [${u.id}] ${u.log.join(' | ')}`);
  if (updates.length > 80) console.log(`  ... yana ${updates.length - 80} ta`);
  if (skipped.length) {
    console.log(`\n⚠️  Qo'lda ko'rish (o'tkazilgan):`);
    for (const s of skipped) console.log(`  [${s.id}] ${s.reason}: ${s.log.join(' | ')}`);
  }

  if (!dryRun && updates.length) {
    let ok = 0, fail = 0;
    for (const u of updates) {
      try { await updateDoc(doc(db, 'questions', u.id), u.fields); ok++; }
      catch (e) { fail++; console.error(`  ❌ [${u.id}] yozish xatosi: ${e.message}`); }
    }
    console.log(`\n✍️  Firestore yangilandi: ${ok} ta hujjat${fail ? ` | ❌ ${fail} xato` : ''}`);
  } else if (dryRun) {
    console.log(`\n🔍 DRY-RUN: ${updates.length} savolga tuzatish tayyor, hech narsa yozilmadi`);
  }
  process.exit(0);
}

main().catch((e) => { console.error('💥 Xato:', e.message); process.exit(1); });
