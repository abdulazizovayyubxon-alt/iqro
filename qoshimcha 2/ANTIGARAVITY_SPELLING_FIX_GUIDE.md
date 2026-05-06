🔧 ANTIGARAVITY'DA IMLOVIY XATOLARNI TUZATISH USULLARI

═══════════════════════════════════════════════════════════

## 1️⃣ ANTIGARAVITY'DA TEKST EDITOR'DA TUZATISH

### **USULI: Find & Replace (Ctrl+H)**

**Step 1: Editor'ni oching**
```
AntiGravity → Files → chqbt_questions_database.json
```

**Step 2: Find & Replace panel'ni oching**
```
Ctrl + H  (yoki Cmd+H Mac'da)
```

**Step 3: Xato so'zni topib almashtirish**

MASALA: `MILOVIY` → `IMLOVIY`

```
Find:    "MILOVIY"
Replace: "IMLOVIY"
Replace All ✅
```

**ASOSIY XATOLAR TO'PLAMI:**

| Xato | To'g'ri | Qanday Almashtirish |
|------|---------|-------------------|
| "qanday" | "qanday" | Find: "qanday" → "qanday" |
| "shunga" | "shunga" | Ctrl+H: Replace All |
| "mumkin" | "mumkin" | Replace All klawishini bosish |
| "kuzasi" | "kuzasi" | Replace All |
| "nomer" | "nomer" | Replace All |

---

## 2️⃣ BULK TUZATISH (Barcha xatolar bir vaqtda)

### **AntiGravity JSON Editor'da:**

```bash
# Step 1: File'ni rasmiy ochish
Ctrl + `  # Terminal ochiladi

# Step 2: sed (Linux) buyrug'i bilan tuzatish
sed -i 's/"qanday"/"qanday"/g' chqbt_questions_database.json
sed -i 's/"shunga"/"shunga"/g' chqbt_questions_database.json
sed -i 's/"mumkin"/"mumkin"/g' chqbt_questions_database.json
sed -i 's/"kuzasi"/"kuzasi"/g' chqbt_questions_database.json

# Step 3: Tekshirish
grep "xato_so'z" chqbt_questions_database.json
```

---

## 3️⃣ O'ZBEK IMLOSINING TO'G'RI QO'LLANTIRISH

### **ASOSIY QO'IDALAR:**

```
✅ SHUNGA:           "shunga bo'ladi"
❌ SHUNGA:           "shunga bo'ladi" (xato)

✅ MUMKIN:           "mumkin bo'ladi"
❌ MUMKIN:           "mumkin bo'ladi" (xato)

✅ KO'RGANCH:        "ko'rganch qiladi"
❌ KO'RGANCH:        "ko'rganch qiladi" (xato)

✅ QO'YILGAN:        "qo'yilgan nishonlar"
❌ QO'YILGAN:        "qo'yilgan nishonlar" (xato)

✅ SHI/CHI:          "shikast beradi" (CHI)
❌ SHI/CHI:          "shikast beradi" (CHI xato)

✅ O'Q:              "o'q", "o'rg'uc"
❌ O'Q:              "o'q", "o'rg'uc" (xato)

✅ QO':              "qo'l", "qo'yish"
❌ QO':              "qo'l", "qo'yish" (xato)

✅ CHI (oxiri):      "har kimga", "shunga"
❌ CHI:              "har kimga", "shunga" (xato)

✅ YI/I:             "qorali", "mumkina" ❌ "qoralyni"
❌ YI:               "qoralyni" (xato)
```

---

## 4️⃣ REGEX PATTERN BILAN TUZATISH (ADVANCED)

### **AntiGravity Terminal'da:**

```bash
# Barcha imloviy xatolarni tuzatish (Regex)
sed -i 's/\(questions.*\)"/\1"/g' chqbt_questions_database.json

# Cyrillic harflarni Latin'ga o'tkazish
sed -i 's/ё/yo/g' chqbt_questions_database.json
sed -i 's/ъ/`/g' chqbt_questions_database.json

# UTF-8 encoding'ni tekshirish
file -i chqbt_questions_database.json
# Natija: UTF-8 unicode bo'lishi kerak
```

---

## 5️⃣ ONLINE TOOL BILAN TUZATISH

### **1. JSONLint.com**
```
1. chqbt_questions_database.json'ni Copy qiling
2. jsonlint.com ga kirish
3. Paste qiling
4. Xatolarni ko'rish
5. Tuzatish
```

### **2. O'zbek Imlo Tekshirgichi**
```
1. savollar.txt faylni tayyorlash
2. qoraxonlik.uz ga kirish
3. Matnni paste qilish
4. Imlo xatolarini ko'rish
5. Tuzatish
```

---

## 6️⃣ PYTHON SKRIPTI BILAN TUZATISH

```python
import json
import re

# JSON faylni o'qish
with open('chqbt_questions_database.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Xatolarni tuzatish
xatolar = {
    'qanday': 'qanday',
    'shunga': 'shunga',
    'mumkin': 'mumkin',
    'qora': 'qora',
    'ko\'rganch': 'ko\'rganch',
    # ...
}

def tuzat_matn(matn):
    for xato, togri in xatolar.items():
        matn = matn.replace(xato, togri)
    return matn

# Barcha savollarni tuzatish
for section in data['sections'].values():
    for question in section['questions']:
        question['question'] = tuzat_matn(question['question'])
        question['explanation'] = tuzat_matn(question['explanation'])
        for i, option in enumerate(question['options']):
            question['options'][i] = tuzat_matn(option)

# Yangi faylni yozish
with open('chqbt_questions_FIXED.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("✅ Barcha imloviy xatolar tuzatildi!")
```

**Ishga tushirish:**
```bash
python fix_spelling.py
# Natija: chqbt_questions_FIXED.json
```

---

## 7️⃣ VS CODE BILAN TUZATISH

```bash
# 1. VS Code'ni oching
code chqbt_questions_database.json

# 2. Replace panel (Ctrl+H)
Find:    (?<="question": ").*?xato.*?(?=")
Replace: [tuzatilgan matn]

# 3. Regex'ni aktiv qilish (.*? tugma)
# 4. Replace All

# 5. JSON validator
Ctrl + Shift + P → "Format Document"
```

---

## 8️⃣ ANTIGARAVITY'DA DEPLOY QO'LLANISH

```bash
# 1. Tuzatilgan faylni upload qilish
git add chqbt_questions_FIXED.json
git commit -m "Fix spelling errors in questions"
git push origin main

# 2. AntiGravity deployment
# AntiGravity → Redeploy
# ✅ Yangi version avtomatik deploy bo'ladi

# 3. Testing
curl http://localhost:5000/api/questions/otish
# JSON to'g'ri bo'lishini tekshiring
```

---

## 9️⃣ JSON FAYLNI VALIDATE QILISH

**KOMANDA:**
```bash
# Python bilan
python -m json.tool chqbt_questions_database.json > /dev/null && echo "✅ Valid JSON"

# Node.js bilan
node -e "require('fs').readFileSync('chqbt_questions_database.json')" && echo "✅ Valid"

# Online
https://jsonlint.com
```

---

## 🔟 COMMON IMLOVIY XATOLAR RO'YXATI

```
❌ XATO          ✅ TO'G'RI
─────────────────────────
qanday           qanday
shunga           shunga
mumkin           mumkin
kuzasi           kuzasi
qora             qora
ko'rganch        ko'rganch
chi              chi
yi/i             yi/i
yo'l             yo'l
qo'l             qo'l
o'q              o'q
o'rg'uc          o'rg'uc
shikast          shikast
beligi           beligi
nishon           nishon
relyef           relyef
topografiya      topografiya
azimut           azimut
```

---

## 1️⃣1️⃣ FINAL CHECKLIST

- [ ] Find & Replace bilan xatolar topib tuzatish
- [ ] JSON validator'da tekshirish
- [ ] Python skriptni ishga tushirish
- [ ] VS Code'da Format Document
- [ ] Terminal'da validate qilish
- [ ] AntiGravity'ga redeploy qilish
- [ ] Test API endpoint'lar
- [ ] Browser'da tekshirish

---

## 🎯 TEZKORLIK USULI (5 DAQIQA)

```bash
# 1. Terminal oching
cd /your/project

# 2. Bulk replace (sed)
sed -i 's/qanday/qanday/g' chqbt_questions_database.json
sed -i 's/shunga/shunga/g' chqbt_questions_database.json
sed -i 's/mumkin/mumkin/g' chqbt_questions_database.json

# 3. Validate
python -m json.tool chqbt_questions_database.json > /dev/null

# 4. Upload
git add -A
git commit -m "Fix all spelling errors"
git push

# 5. Deploy
# AntiGravity → Redeploy ✅

# BITTI! ⏱️ 5 daqiqa
```

---

## 📞 XATOLIK BO'LSA

```
XATO: "Unexpected token" JSON'da
TUZATISH: 
1. JSONLint.com ga kirish
2. Qaysi qatorda xato ekanini topish
3. Qo'shtirnoq yoki vergul tekshirish
4. Tuzatish

XATO: Imloviy xato hali ko'rinadi
TUZATISH:
1. find . -name "*.json" | xargs grep "xato_so'z"
2. Barcha file'larda almashtirib chiqish
3. Tekshirish
```

---

## 🎉 NATIJA

```
✅ JSON valid
✅ Imloviy xatolar yo'q
✅ API ishlaydi
✅ Frontend chiqadi
✅ ANTIGARAVITY'DA DEPLOY QILINGAN!

13-MAY IMTIHONIGA TAYYOR! 🚀
```
