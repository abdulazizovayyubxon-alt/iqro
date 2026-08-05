import React from 'react';
import DOMPurify from 'dompurify';

/**
 * SafeHtml — XSS hujumlaridan himoyalangan HTML renderer
 * dangerouslySetInnerHTML o'rniga ishlatiladi
 *
 * DOMPurify barcha zararli <script>, onerror, onclick kabi
 * kodlarni avtomatik tozalaydi.
 *
 * Props:
 *  - html: string (HTML kontent)
 *  - className: string
 *  - style: object
 */
const SafeHtml = ({ html, className, style }) => {
  const clean = DOMPurify.sanitize(html || '', {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'span', 'div', 'ul', 'ol', 'li', 'img', 'sub', 'sup', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
    // `style` ATAYLAB olib tashlandi (audit 2026-08-05, 21-band): ixtiyoriy CSS
    // bilan ekranni qoplaydigan element yasab, foydalanuvchini boshqa joyni
    // bosishga majburlash (clickjacking) mumkin edi. Ko'rinishni `class` beradi.
    ALLOWED_ATTR: ['src', 'alt', 'width', 'height', 'class'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'style'],
    FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload', 'onmouseover'],
    // `data:`/`blob:` rasmga ruxsat, `javascript:` esa DOMPurify tomonidan
    // baribir bloklanadi
    ALLOWED_URI_REGEXP: /^(?:https?:|data:image\/|blob:|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i
  });

  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
};

export default SafeHtml;
