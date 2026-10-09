import { expect, test } from '@playwright/test';

test('onboard, complete a task, see progress, and keep data after reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Chào mừng/ })).toBeVisible();

  await page.getByLabel('Cân nặng (kg)').fill('65');
  await page.getByRole('button', { name: 'Bắt đầu' }).click();

  await expect(page.getByText(/\d+\/\d+ nhiệm vụ/)).toBeVisible();
  const firstDone = page.getByRole('button', { name: /^Hoàn thành: / }).first();
  await firstDone.click();
  await expect(page.getByText(/^1\/\d+ nhiệm vụ$/)).toBeVisible();

  await page.getByRole('button', { name: 'Tiến độ' }).click();
  await expect(page.getByText(/Tuần này: 1\/\d+ nhiệm vụ/)).toBeVisible();

  await page.getByRole('button', { name: 'Khu vườn', exact: true }).click();
  await page.getByRole('button', { name: 'Ô 1', exact: true }).click();
  await page.getByRole('button', { name: 'Đặt Cỏ xanh' }).click();
  await expect(page.getByRole('button', { name: 'Ô 1: Cỏ xanh' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible();
  await page.getByRole('button', { name: 'Khu vườn', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ô 1: Cỏ xanh' })).toBeVisible();
  await page.getByRole('button', { name: 'Hôm nay' }).click();
  await expect(page.getByText(/^1\/\d+ nhiệm vụ$/)).toBeVisible();
});

test('skipping setup works and missing a day loses nothing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Bỏ qua' }).click();
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible();
  await page.getByRole('button', { name: /^Hoàn thành: / }).first().click();
  await expect(page.getByText(/thất bại|héo|mất/i)).toHaveCount(0);
});
