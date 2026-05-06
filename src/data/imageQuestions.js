// Rasmli va jadvallli savollar — namuna to'plami
// Format:
//   q: string | HTML (agar isHtml=true)
//   image: '/images/fayl.png' — savol ustida ko'rsatiladigan rasm
//   isHtml: true — q matnini HTML sifatida render qilish
//   opts: [...], correct: 0-3, explanation: '...'

export const imageQuestions = [

  // ===== RASIMLI SAVOLLAR =====
  {
    id: 'img_001',
    q: 'Sof Nizomiga ko\'ra, "Mashinalarga" signali bayroq vositasida o\'ng qo\'lga sariq, chap qo\'lga qizil bayroqchani ushlab bajariladi.\n\nBu signal fanus vositasida berilganda qanday ko\'rinishda bo\'ladi?',
    image: '/images/signal_flags.png',
    isHtml: false,
    opts: [
      'O\'ng qo\'lda — yashil, chap qo\'lda — qizil fanus',
      'O\'ng qo\'lda — sariq, chap qo\'lda — yashil fanus',
      'O\'ng qo\'lda — oq, chap qo\'lda — qizil fanus',
      'O\'ng qo\'lda — qizil, chap qo\'lda — yashil fanus'
    ],
    correct: 2,
    explanation: 'Fanus vositasida signallar: o\'ng qo\'lda oq (sariq o\'rniga), chap qo\'lda qizil fanus ishlatiladi.',
    topicId: 'topic_1',
    category: 'chqbt'
  },

  {
    id: 'img_002',
    q: 'Rasmda tasvirlangan gaz niqobining qaysi qismi filtrlovchi element hisoblanadi?',
    image: '/images/gas_mask.png',
    isHtml: false,
    opts: [
      '1-qism (yuz niqobi)',
      '2-qism (filtr patroni)',
      '3-qism (klapan tizimi)',
      '4-qism (bosh tasmalari)'
    ],
    correct: 1,
    explanation: 'Gaz niqobining filtrlovchi elementi — 2-qism (filtr patroni). U zararli moddalarni tutib qoladi va toza havo o\'tkazadi.',
    topicId: 'topic_1',
    category: 'chqbt'
  },

  {
    id: 'img_003',
    q: 'Rasmda ko\'rsatilgan qurolning qaysi qismi o\'q-dori manbasini (o\'qlar saqlanadigan joyni) ifodalaydi?',
    image: '/images/ak74.png',
    isHtml: false,
    opts: [
      '1-qism (lula)',
      '2-qism (qo\'ndaq)',
      '3-qism (o\'qdon — magazin)',
      '4-qism (ushlagich)'
    ],
    correct: 2,
    explanation: 'O\'qdon (magazin) — 3-qism bo\'lib, u o\'q-dorilarni saqlaydi. AK-74 da 30 ta o\'q sig\'adigan magazin ishlatiladi.',
    topicId: 'topic_1',
    category: 'chqbt'
  },

  // ===== JADVAL SAVOLLARI =====
  {
    id: 'tbl_001',
    isHtml: true,
    q: `<p style="margin-bottom:12px">Harbiy atamalarga mos ta'rifni moslashtiring:</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:8px">
  <thead>
    <tr>
      <th style="padding:8px 12px;border:1px solid #d1d5db;background:#f3f4f6;text-align:left;width:35%">Harbiy atama</th>
      <th style="padding:8px 12px;border:1px solid #d1d5db;background:#f3f4f6;text-align:left">Ta'rif</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:8px 12px;border:1px solid #d1d5db;font-weight:600">1. Muddatli harbiy xizmat</td>
      <td style="padding:8px 12px;border:1px solid #d1d5db">a) Qurolli Kuchlar safida oddiy askarlar tarkibi lavozimlarda majburiy xizmatni o'tayotgan, chaqiruv yoshidagi fuqaro</td>
    </tr>
    <tr style="background:#f9fafb">
      <td style="padding:8px 12px;border:1px solid #d1d5db;font-weight:600">2. Zaxiradagi ofitser</td>
      <td style="padding:8px 12px;border:1px solid #d1d5db">b) harbiy xizmatni kasb sifatida tanlagan va harbiy xizmat majburiyatlarini kontrakt asosida bajarayotgan fuqaro</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;border:1px solid #d1d5db;font-weight:600">3. Kontrakt bo'yicha ofitser</td>
      <td style="padding:8px 12px;border:1px solid #d1d5db">c) ofitserlik unvoniga ega bo'lgan, muqaddam harbiy xizmat o'tagan va rezervga bo'shatilgan harbiy xizmatga majbur fuqaro</td>
    </tr>
  </tbody>
</table>`,
    opts: [
      '1-a, 2-c, 3-b',
      '1-a, 2-b, 3-c',
      '1-b, 2-c, 3-a',
      '1-c, 2-a, 3-b'
    ],
    correct: 0,
    explanation: 'To\'g\'ri javob: 1-a (muddatli xizmat — chaqiruv yoshi), 2-c (zaxiradagi ofitser — rezervga bo\'shatilgan), 3-b (kontrakt — kasb sifatida tanlagan).',
    topicId: 'topic_1',
    category: 'chqbt'
  },

  {
    id: 'tbl_002',
    isHtml: true,
    q: `<p style="margin-bottom:12px">Jangovar guruhning tarkibiga kiruvchi lavozimga mos qurollanish va qurolning jangovar jamlanmasini toping.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:8px">
  <thead>
    <tr>
      <th style="padding:8px 12px;border:1px solid #d1d5db;background:#f3f4f6;text-align:left">Lavozim</th>
      <th style="padding:8px 12px;border:1px solid #d1d5db;background:#f3f4f6;text-align:left">Qurol turi</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:8px 12px;border:1px solid #d1d5db">a) guruh komandiri<br/>b) komandir o'rinbosari<br/>c) granatomyotchi</td>
      <td style="padding:8px 12px;border:1px solid #d1d5db">1) RPG-7 (4 ta granata)<br/>2) RPK yoki PK (2000 ta patron)<br/>3) PKS (2500 ta patron)<br/>4) AKM yoki AK-74 (450 ta patron)<br/>5) PM (32 ta patron)</td>
    </tr>
  </tbody>
</table>`,
    opts: [
      'a+4; b+3; c+2',
      'a+5; b+4; c+1',
      'a+5; b+3; c+1',
      'a+4; b+5; c+1'
    ],
    correct: 2,
    explanation: 'Guruh komandiri — PM (32 patron), komandir o\'rinbosari — RPK/PK (2000-2500 patron), granatomyotchi — RPG-7 (4 granata).',
    topicId: 'topic_1',
    category: 'chqbt'
  },

  // ===== RO'YXATLI SAVOLLAR =====
  {
    id: 'lst_001',
    isHtml: true,
    q: `<p style="margin-bottom:12px">Jangovar imkoniyat quyidagilarning qaysi biriga bog'liq bo'ladi?</p>
<ol style="margin:0;padding-left:20px;line-height:1.8;font-size:15px">
  <li>shaxsiy tarkib soniga</li>
  <li>qurol-yarog', harbiy texnikalarning miqdori va texnik holatiga</li>
  <li>komandirlarning bilim malakasiga</li>
  <li>yil fasli va ob-havoga</li>
</ol>`,
    opts: [
      '2, 3, 4',
      '1, 2, 3, 4',
      '1, 2, 3',
      '2 va 3'
    ],
    correct: 1,
    explanation: 'Jangovar imkoniyat barcha 4 omilga bog\'liq: shaxsiy tarkib soni, qurol-texnika holati, komandirlar malakasi va tabiiy sharoitlar.',
    topicId: 'topic_1',
    category: 'chqbt'
  },

  {
    id: 'lst_002',
    isHtml: true,
    q: `<p style="margin-bottom:12px">Quroldan otish paytida tepki bosil'gandan keyin yuz beradigan jarayonlar ketma-ketligini toping:</p>
<ol style="margin:0;padding-left:20px;line-height:1.8;font-size:15px">
  <li>piston (kapsyul) sindiriladi va alanga hosil bo'ladi</li>
  <li>pistonning alangasi ta'sirida porox o't oladi</li>
  <li>stvol kanalida yuqori bosim hosil bo'ladi</li>
  <li>porox zaryadı gazga aylanadi</li>
  <li>bosim kuchi stvolni aylanma harakat oladi va o'zining bo'ylama o'qi atrofida aylanganicha stvol kanalidan uchib chiqadi</li>
</ol>`,
    opts: [
      '1, 2, 3, 4, 5',
      '1, 3, 2, 4, 5',
      '1, 4, 2, 3, 5',
      '2, 1, 4, 3, 5'
    ],
    correct: 0,
    explanation: 'Otish jarayoni: kapsula sinadi → alanga → porox yonadi → gaz hosil bo\'ladi → bosim ortadi → o\'q uchib chiqadi.',
    topicId: 'topic_1',
    category: 'chqbt'
  }
];
