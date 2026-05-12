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
    ALLOWED_ATTR: ['src', 'alt', 'width', 'height', 'style', 'class'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover']
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
