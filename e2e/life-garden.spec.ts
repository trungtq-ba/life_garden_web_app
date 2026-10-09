import { expect, test } from '@playwright/test';

test('onboard, complete a task, see progress, and keep data after reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Chào mừng/ })).toBeVisible();

  await page.getByLabel('Cân nặng (kg)').fill('65');
  await page.getByRole('button', { name: 'Bắt đầu' }).click();

  await expect(page.getByTestId('garden-scene')).toBeVisible();
  await expect(page.getByTestId('garden-scene')).toHaveAttribute('aria-label', /Khu vườn của tôi/);
  await expect(page.getByText(/\d+\/\d+ nhiệm vụ/)).toBeVisible();
  const firstDone = page.getByRole('button', { name: /^Hoàn thành: / }).first();
  await firstDone.click();
  await expect(page.getByText(/^1\/\d+ nhiệm vụ$/)).toBeVisible();
  await expect(page.locator('.water-burst')).toHaveCount(1);

  await page.getByRole('button', { name: 'Tiến độ' }).click();
  await expect(page.getByText(/Tuần này: 1\/\d+ nhiệm vụ/)).toBeVisible();

  await page.getByRole('button', { name: 'Khu vườn', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Trong vườn của bạn' })).toBeVisible();
  await expect(page.getByText(/^Hoa cúc · còn \d+ điểm$/)).toBeVisible();

  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible();
  await page.getByRole('button', { name: 'Khu vườn', exact: true }).click();
  await expect(page.getByText(/^Cỏ xanh · /)).toBeVisible();
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

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('forces the calm garden', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Bỏ qua' }).click();
    await expect(page.getByTestId('garden-scene')).toHaveClass(/calm/);
    await expect(page.locator('.raindrop')).toHaveCount(0);
  });
});

test('an old v1 save is upgraded without losing the garden level', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('life-garden:v1', JSON.stringify({
      version: 1,
      profile: { goal: 'general', activity: 'low', minutesPerDay: 30 },
      settings: { habits: ['water'], reminderTime: '20:00', notificationsEnabled: false, customTasks: [] },
      days: {},
      garden: { name: 'Vườn cũ', unlockedLevel: 4, placed: [{ cell: 1, itemId: 'daisy' }] },
    }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Khu vườn', exact: true }).click();
  await expect(page.getByLabel('Tên khu vườn')).toHaveValue('Vườn cũ');
  await expect(page.getByText('Cây táo · mới gieo (0%)')).toBeVisible();
});
