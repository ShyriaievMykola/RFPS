import { expect, test } from '@playwright/test';
import { DEMO_INVITE } from '../src/mocks/seed';
import { expectNoHorizontalScroll, fillLogin, loginAs, residentEmail } from './helpers';

test.describe('автентифікація', () => {
  test('неавторизованого користувача перенаправляє на вхід', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Вхід' })).toBeVisible();
  });

  test('порожня форма показує помилки валідації', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Увійти' }).click();
    await expect(page.getByText('Заповніть це поле')).toHaveCount(2);
    await expect(page.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true');
  });

  test('хибний пароль не пускає й показує кількість спроб', async ({ page }) => {
    await page.goto('/login');
    await fillLogin(page, residentEmail, 'Wrong-password-1');
    await expect(page.getByRole('alert')).toContainText('Неправильний e-mail або пароль');
    await expect(page.getByRole('alert')).toContainText('4 спроби');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('після п’яти невдалих спроб вхід блокується', async ({ page }) => {
    await page.goto('/login');
    await fillLogin(page, residentEmail, 'Wrong-password-1');
    const submit = page.getByRole('button', { name: 'Увійти' });
    for (let attempt = 2; attempt <= 5; attempt++) {
      await expect(submit).toBeEnabled();
      await submit.click();
    }
    await expect(page.getByRole('alert')).toContainText('Забагато невдалих спроб');
    await expect(submit).toBeDisabled();
  });

  test('мешканець входить, сесія переживає перезавантаження, вихід її завершує', async ({
    page,
  }) => {
    await loginAs(page, 'resident');
    await expect(page.getByRole('heading', { name: 'Огляд' })).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Огляд' })).toBeVisible();

    await page.getByRole('button', { name: 'Вийти' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('реєстрація за кодом запрошення створює обліковий запис', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Код запрошення').fill('WRONG-CODE');
    await page.getByLabel('Ім’я та прізвище').fill('Тест Тестенко');
    await page.getByLabel('E-mail').fill('e2e.resident@demo.ua');
    await page.getByLabel('Пароль', { exact: true }).fill('E2e-password-1');
    await page.getByLabel('Повторіть пароль').fill('E2e-password-1');
    await page.getByRole('button', { name: 'Створити обліковий запис' }).click();
    await expect(page.getByText('Код запрошення недійсний')).toBeVisible();

    await page.getByLabel('Код запрошення').fill(DEMO_INVITE.code);
    await page.getByRole('button', { name: 'Створити обліковий запис' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(`Квартира ${DEMO_INVITE.apartmentId} —`)).toBeVisible();
  });

  test('мову інтерфейсу можна перемкнути на англійську', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Мова' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('сторінка входу не має горизонтального прокручування', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Вхід' })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
