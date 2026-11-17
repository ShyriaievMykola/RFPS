import { expect, type Page } from '@playwright/test';
import { DEMO_ACCOUNTS } from '../src/mocks/seed';

type DemoRole = 'resident' | 'admin';

function account(role: DemoRole) {
  const found = DEMO_ACCOUNTS.find((item) => item.role === role);
  if (!found) throw new Error(`Немає демо-акаунта для ролі ${role}`);
  return found;
}

export async function fillLogin(page: Page, email: string, password: string): Promise<void> {
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Увійти' }).click();
}

/** Входить демо-користувачем і чекає на його стартову сторінку. */
export async function loginAs(page: Page, role: DemoRole): Promise<void> {
  const { email, password } = account(role);
  await page.goto('/login');
  await fillLogin(page, email, password);
  await expect(page).toHaveURL(role === 'admin' ? /\/admin$/ : /\/dashboard$/);
}

export const residentEmail = account('resident').email;

/** Головне меню: бічне на широкому екрані, нижня панель вкладок на телефоні. */
export function mainNav(page: Page) {
  return page.getByRole('navigation', { name: 'Головне меню' }).filter({ visible: true });
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
