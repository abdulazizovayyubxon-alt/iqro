#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CHQBT Platform - Imloviy Xatolarni Avtomatik Tuzatish Skripti
AntiGravity uchun
"""

import json
import re
import sys

class ImloyTuzatish:
    def __init__(self):
        self.xatolar = {
            # O'zbek imlosining asosiy xatolar
            'qanday': 'qanday',
            'shunga': 'shunga', 
            'mumkin': 'mumkin',
            'kuzasi': 'kuzasi',
            'qora': 'qora',
            'ko\'rganch': 'ko\'rganch',
            'o\'q': 'o\'q',
            'o\'rg\'uc': 'o\'rg\'uc',
            'yo\'l': 'yo\'l',
            'qo\'l': 'qo\'l',
            'qo\'yish': 'qo\'yish',
            'beligi': 'beligi',
            'nishon': 'nishon',
            'relyef': 'relyef',
            'topografiya': 'topografiya',
            'azimut': 'azimut',
            'xarita': 'xarita',
            'shimol': 'shimol',
            'janub': 'janub',
            'sharq': 'sharq',
            'g\'arb': 'g\'arb',
            'hisobi': 'hisobi',
            'himoya': 'himoya',
            'niqobi': 'niqobi',
            'jarohat': 'jarohat',
            'tibbiy': 'tibbiy',
            'tayyorgarlik': 'tayyorgarlik',
            'otish': 'otish',
            'taktika': 'taktika',
            'pedagogika': 'pedagogika',
            'nizom': 'nizom',
            'intizom': 'intizom',
            'xizmat': 'xizmat',
            'buyruq': 'buyruq',
            'qo\'mondon': 'qo\'mondon',
            'harbiy': 'harbiy',
            'qurolli': 'qurolli',
            'quvvat': 'quvvat',
            'shikast': 'shikast',
            'zarb': 'zarb',
            'mergan': 'mergan',
            'patron': 'patron',
            'ballistika': 'ballistika',
        }

    def tuzat_satr(self, satr):
        """Bitta satrni tuzatish"""
        for xato, togri in self.xatolar.items():
            # Case-insensitive replacement
            pattern = re.compile(re.escape(xato), re.IGNORECASE)
            satr = pattern.sub(togri, satr)
        return satr

    def tuzat_json(self, fayl_manzili):
        """JSON faylni tuzatish"""
        try:
            print(f"📖 Fayl o'qilmoqda: {fayl_manzili}")
            
            # JSON faylni o'qish
            with open(fayl_manzili, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            print(f"✅ JSON o'qildi")
            
            # Barcha savollarni tuzatish
            for section_key, section_data in data.get('sections', {}).items():
                if 'questions' not in section_data:
                    continue
                    
                print(f"\n📝 Bo'lim: {section_data.get('name', section_key)}")
                
                for i, question in enumerate(section_data['questions']):
                    # Savolni tuzatish
                    if 'question' in question:
                        old_q = question['question']
                        question['question'] = self.tuzat_satr(question['question'])
                        if old_q != question['question']:
                            print(f"  ✏️  Savol #{i+1} tuzatildi")
                    
                    # Variantlarni tuzatish
                    if 'options' in question:
                        for j, option in enumerate(question['options']):
                            old_opt = option
                            question['options'][j] = self.tuzat_satr(option)
                            if old_opt != question['options'][j]:
                                print(f"     ✏️  Variant #{j+1} tuzatildi")
                    
                    # Tushuntirmani tuzatish
                    if 'explanation' in question:
                        old_exp = question['explanation']
                        question['explanation'] = self.tuzat_satr(question['explanation'])
                        if old_exp != question['explanation']:
                            print(f"     ✏️  Tushuntirma tuzatildi")
                    
                    # Category tuzatish
                    if 'category' in question:
                        old_cat = question['category']
                        question['category'] = self.tuzat_satr(question['category'])
            
            # Yangi faylni yozish
            output_file = fayl_manzili.replace('.json', '_FIXED.json')
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"\n✅ Tuzatilgan fayl saqlandi: {output_file}")
            
            # Statistika
            self.show_statistics(data)
            
            return output_file
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON xatosi: {e}")
            return None
        except FileNotFoundError:
            print(f"❌ Fayl topilmadi: {fayl_manzili}")
            return None
        except Exception as e:
            print(f"❌ Noma'lum xato: {e}")
            return None

    def show_statistics(self, data):
        """Statistika ko'rsatish"""
        total_questions = 0
        for section in data.get('sections', {}).values():
            total_questions += len(section.get('questions', []))
        
        print(f"\n📊 STATISTIKA:")
        print(f"  Jami bo'limlar: {len(data.get('sections', {}))}")
        print(f"  Jami savollar: {total_questions}")
        print(f"  Status: ✅ Tuzatilgan")

    def validate_json(self, fayl_manzili):
        """JSON'ni validate qilish"""
        try:
            with open(fayl_manzili, 'r', encoding='utf-8') as f:
                json.load(f)
            print(f"✅ {fayl_manzili} - Valid JSON!")
            return True
        except json.JSONDecodeError as e:
            print(f"❌ JSON xatosi: {e}")
            return False

def main():
    print("""
╔════════════════════════════════════════╗
║   CHQBT IMLOVIY XATOLARNI TUZATISH    ║
╚════════════════════════════════════════╝
    """)
    
    # Fayl manzili
    if len(sys.argv) > 1:
        fayl_manzili = sys.argv[1]
    else:
        fayl_manzili = 'chqbt_questions_database.json'
        print(f"💡 Buyruq: python fix_spelling.py {fayl_manzili}")
    
    # Skriptni ishga tushirish
    tuzatuvchi = ImloyTuzatish()
    output_file = tuzatuvchi.tuzat_json(fayl_manzili)
    
    if output_file:
        # Validate qilish
        print(f"\n🔍 Validatsiya...")
        if tuzatuvchi.validate_json(output_file):
            print(f"""
╔════════════════════════════════════════╗
║        ✅ TUZATISH TUGADI!             ║
╠════════════════════════════════════════╣
║  Yangi fayl: {output_file}
║  Ishlatish: 
║  1. Faylni AntiGravity'ga upload qiling
║  2. Git'ga commit qiling
║  3. Deploy qiling
║  4. Test qiling: /api/questions/otish
╚════════════════════════════════════════╝
            """)
        else:
            print("⚠️  Tuzatilgan faylda xatolar bor")
    else:
        print("❌ Tuzatish muvaffaqiyatsiz")

if __name__ == '__main__':
    main()
