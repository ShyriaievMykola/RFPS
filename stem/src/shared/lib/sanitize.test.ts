import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  it('залишає дозволене форматування', () => {
    expect(sanitizeHtml('<p>Вода з <b>10:00</b></p>')).toBe('<p>Вода з <b>10:00</b></p>');
  });

  it('вирізає скрипти', () => {
    expect(sanitizeHtml('<p>Привіт</p><script>alert(1)</script>')).toBe('<p>Привіт</p>');
  });

  it('вирізає обробники подій і заборонені теги', () => {
    const clean = sanitizeHtml('<img src=x onerror="alert(1)"><b onclick="steal()">текст</b>');
    expect(clean).toBe('<b>текст</b>');
  });

  it('відкидає посилання з протоколом javascript:', () => {
    const clean = sanitizeHtml('<a href="javascript:alert(1)">клік</a>');
    expect(clean).not.toContain('javascript:');
  });

  it('зовнішні посилання відкриває безпечно', () => {
    const clean = sanitizeHtml('<a href="https://example.com">сайт</a>');
    expect(clean).toContain('rel="noopener noreferrer"');
    expect(clean).toContain('target="_blank"');
  });
});
