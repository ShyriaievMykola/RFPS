import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, loginAs, mainNav } from './helpers';

test.describe('адміністратор', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('симулятор проводить картку живлення через усі стани', async ({ page }) => {
    const card = page.getByRole('region', { name: 'Джерело живлення будинку' });
    const simulator = page.getByLabel('Стан джерела живлення');

    const states = [
      ['grid', 'grid', 'Міська мережа'],
      ['starting', 'generatorStarting', 'Запуск генератора'],
      ['running', 'generatorRunning', 'Працює генератор'],
      ['lowFuel', 'generatorLowFuel', 'Генератор: мало палива'],
      ['battery', 'battery', 'Живлення від акумуляторів'],
      ['fault', 'fault', 'Аварія: живлення відсутнє'],
    ] as const;

    for (const [option, state, title] of states) {
      await simulator.selectOption(option);
      await expect(card).toHaveAttribute('data-state', state);
      await expect(card.getByText(title, { exact: true })).toBeVisible();
    }
    // Аварію екранний диктор має озвучити негайно.
    await expect(card.getByRole('alert')).toHaveText('Аварія: живлення відсутнє');
    await expectNoHorizontalScroll(page);
  });

  test('для вільної квартири створюється код запрошення', async ({ page }) => {
    await mainNav(page).getByRole('link', { name: 'Квартири' }).click();
    await expect(page.getByRole('rowheader')).toHaveCount(36);

    const codesBefore = await page.locator('code').count();
    await page.getByRole('button', { name: 'Запросити' }).first().click();
    await expect(page.locator('code')).toHaveCount(codesBefore + 1);
    await expect(page.locator('code').last()).toHaveText(/^OSBB-KV\d{2}-/);
  });

  test('пошук фільтрує квартири', async ({ page }) => {
    await mainNav(page).getByRole('link', { name: 'Квартири' }).click();
    await page.getByRole('searchbox').fill('Петренко');
    await expect(page.getByRole('rowheader')).toHaveCount(1);
    await expect(page.getByRole('rowheader')).toHaveText('12');
  });

  test('з тексту оголошення вирізається небезпечний код', async ({ page }) => {
    await mainNav(page).getByRole('link', { name: 'Оголошення' }).click();
    await page.getByLabel('Заголовок').fill('Перевірка безпеки');
    await page
      .getByLabel('Текст')
      .fill(
        '<p>Важливий <b>текст</b></p>' +
          '<script>window.__xss = 1</script>' +
          '<img src="x" onerror="window.__xss = 2">',
      );
    await page.getByRole('button', { name: 'Опублікувати' }).click();
    await expect(page.getByText('Оголошення опубліковано')).toBeVisible();

    const published = page.getByRole('listitem').filter({ hasText: 'Перевірка безпеки' });
    await expect(published.locator('b')).toHaveText('текст');
    await expect(published.locator('script, img')).toHaveCount(0);
    expect(await page.evaluate(() => (window as { __xss?: number }).__xss)).toBeUndefined();
  });

  test('розділи мешканця адміністратору недоступні', async ({ page }) => {
    await page.goto('/limits');
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('тарифи можна змінити', async ({ page }) => {
    await page.goto('/settings');
    const dayTariff = page.getByLabel('Денний тариф, грн за кВт·год');
    await expect(dayTariff).toHaveValue('4.32');
    await dayTariff.fill('5.5');
    await page.getByRole('button', { name: 'Зберегти' }).click();
    await expect(page.getByText('Тарифи збережено')).toBeVisible();
    await page.reload();
    await expect(dayTariff).toHaveValue('5.5');
  });
});
