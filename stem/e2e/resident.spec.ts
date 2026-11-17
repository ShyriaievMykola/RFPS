import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, loginAs, mainNav } from './helpers';

test.describe('мешканець', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'resident');
  });

  test('огляд показує джерело живлення, показники та графік', async ({ page }) => {
    const powerCard = page.getByRole('region', { name: 'Джерело живлення будинку' });
    await expect(powerCard).not.toHaveAttribute('data-state', 'loading');
    await expect(page.getByText('Прогноз рахунку')).toBeVisible();
    await expect(page.getByRole('figure', { name: 'Споживання сьогодні' })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('графік можна переглянути як таблицю', async ({ page }) => {
    await page.getByRole('button', { name: 'Таблиця' }).click();
    await expect(page.getByRole('columnheader', { name: 'Денна зона' })).toBeVisible();
    await expect(page.getByRole('figure', { name: 'Споживання сьогодні' })).toBeHidden();
  });

  test('аналітика перемикає періоди й показує прогноз', async ({ page }) => {
    await mainNav(page).getByRole('link', { name: 'Аналітика' }).click();
    await expect(page.getByRole('heading', { name: 'Аналітика' })).toBeVisible();

    const year = page.getByRole('button', { name: '12 місяців' });
    await year.click();
    await expect(year).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('кВт·год за місяць')).toBeVisible();

    await expect(page.getByRole('figure', { name: 'Прогноз до кінця місяця' })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('ліміт можна створити й видалити', async ({ page }) => {
    await mainNav(page).getByRole('link', { name: 'Ліміти' }).click();
    await page.getByRole('button', { name: 'Додати ліміт' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Назва').fill('E2E ліміт');
    await dialog.getByLabel('Період').selectOption('day');
    await dialog.getByLabel('Поріг, кВт·год').fill('500');
    await dialog.getByRole('button', { name: 'Зберегти' }).click();

    await expect(page.getByText('Ліміт створено')).toBeVisible();
    await expect(page.getByRole('meter', { name: 'E2E ліміт' })).toBeVisible();

    await page.getByRole('button', { name: 'Видалити ліміт «E2E ліміт»' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Видалити' }).click();
    await expect(page.getByRole('meter', { name: 'E2E ліміт' })).toHaveCount(0);
  });

  test('графік відключень показує сім днів', async ({ page }) => {
    await mainNav(page).getByRole('link', { name: 'Відключення' }).click();
    await expect(page.getByRole('heading', { name: 'Графік відключень' })).toBeVisible();
    await expect(page.getByText('сьогодні')).toBeVisible();
    await expect(
      page.getByRole('listitem').filter({ hasText: /^(пн|вт|ср|чт|пт|сб|нд),/ }),
    ).toHaveCount(7);
    await expectNoHorizontalScroll(page);
  });

  test('звіт експортується у CSV', async ({ page }) => {
    await mainNav(page).getByRole('link', { name: 'Звіти' }).click();
    await expect(page.getByRole('rowheader', { name: 'Разом' })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Завантажити CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^energy-report-kv12-\d{4}-\d{2}\.csv$/);
  });

  test('звіт експортується у PDF', async ({ page }) => {
    await mainNav(page).getByRole('link', { name: 'Звіти' }).click();
    await expect(page.getByRole('rowheader', { name: 'Разом' })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Завантажити PDF' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^energy-report-kv12-\d{4}-\d{2}\.pdf$/);
  });

  test('сторінки адміністратора мешканцю недоступні', async ({ page }) => {
    await page.goto('/admin/apartments');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(mainNav(page).getByRole('link', { name: 'Квартири' })).toHaveCount(0);
  });

  test('тему можна перемкнути на темну, вибір зберігається', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Темна' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
