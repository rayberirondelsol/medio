import { test, expect } from '@playwright/test';

const makeEmail = () => `pw-${Date.now()}@example.com`;

test('register surfaces backend response', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: /sign up/i }).click();
  await expect(page).toHaveURL(/\/register$/);

  const email = makeEmail();
  await page.getByLabel('Name').fill('Playwright Smoke');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('PlaywrightSmokePass123!');
  await page.getByLabel('Confirm Password').fill('PlaywrightSmokePass123!');

  const responsePromise = page.waitForResponse((res) => res.url().includes('/auth/register'));
  await page.getByRole('button', { name: /sign up|register/i }).click();
  const response = await responsePromise;

  const body = await response.text();
  console.log('Status:', response.status());
  console.log('Body:', body);

  expect(response.status()).toBeLessThan(500);
});
