// CHQBT-600 ko'rigida QO'LDA topilgan imlo/terish xatolari.
// scripts/fix-typos-dict.mjs lug'atiga tushmagan, lekin bazada takrorlanadigan
// so'zlar. screen.mjs har bir nomzodni shu ro'yxat bo'yicha ham tekshiradi.
export const IMLO = [
  ["tersi", "teri"],
  ["qatiqan", "qat'iyan"],
  ["parenximatal", "parenximatoz"],
  ["plevara", "plevra"],
  ["ko'kariq", "ko'karish"],
  ["kompres", "kompress"],
  ["kuyushgi", "kuydirgi"],
  ["yarorga", "yaradorga"],
  ["punktomga", "punktga"],
  ["marsot", "marsh"],
  ["xavfsaz", "xavfsiz"],
  ["qo'shniva", "qo'shni"],
  ["ertalbod", "ertalab"],
  ["qonamash", "qon ketish"],
  ["kelguniga qacha", "kelgunicha"],
  ["o'chur", "o'chir"],
  ["yoyoqchasiga", "yelkasiga"],
  ["surtdirib", "surtib"],
  ["toshqa", "toshga"],
  ["imon bermaydi", "imkon bermaydi"],
  ["aniql ", "aniqlash "],
  ["vaziyotli", "vaziyatli"],
  ["yog'ingarchik", "yog'ingarchilik"],
];

// Matnda xato o'zak bor-yo'qligini tekshiradi (to'g'ri shakl bo'lsa — o'tkazadi).
export function imloReasons(text) {
  const out = [];
  const t = String(text || "").toLowerCase();
  for (const [bad, good] of IMLO) {
    if (t.includes(bad) && !t.includes(good.toLowerCase())) out.push(`imlo: "${bad}" → "${good}"`);
  }
  return out;
}
