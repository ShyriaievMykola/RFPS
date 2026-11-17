import DOMPurify from 'dompurify';

// Дозволено лише базове форматування тексту. Скрипти, обробники подій (onclick…),
// стилі, зображення та iframe вирізаються — так текст оголошення не може виконати код (XSS).
const ALLOWED_TAGS = ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'a'];
const ALLOWED_ATTR = ['href'];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Лише http(s) і mailto: посилання javascript:… відкидаються.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
  });
}

// Зовнішні посилання відкриваються в новій вкладці без доступу до window.opener.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});
