import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:3000';

async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/E-mail/i).fill(email);
  await page.getByLabel(/Senha/i).fill(password);
  await page.getByRole('button', { name: /Entrar/i }).click();
  await page.waitForURL(/\/(admin|student|accept-terms)/, { timeout: 8000 });
  // If redirected to accept-terms, we can't proceed with these flows
}

test.describe('Admin Navigation (MASTER_ADMIN)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'mateusfranco@gmail.com', 'Admin@2026!');
  });

  test('admin sidebar is visible with correct links', async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    await expect(page.getByRole('navigation', { name: /Navegação principal/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Usuários/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Lojas/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Cursos/i })).toBeVisible();
  });

  test('can navigate to users list', async ({ page }) => {
    await page.goto(`${BASE}/admin/users`);
    await expect(page.getByRole('heading', { name: /Usuários/i })).toBeVisible();
  });

  test('can navigate to stores list', async ({ page }) => {
    await page.goto(`${BASE}/admin/stores`);
    await expect(page.getByRole('heading', { name: /Lojas/i })).toBeVisible();
  });

  test('can navigate to courses list', async ({ page }) => {
    await page.goto(`${BASE}/admin/courses`);
    await expect(page.getByRole('heading', { name: /Cursos/i })).toBeVisible();
  });

  test('can navigate to reports hub', async ({ page }) => {
    await page.goto(`${BASE}/admin/reports`);
    await expect(page.getByRole('heading', { name: /Relatórios/i })).toBeVisible();
  });

  test('can navigate to audit log', async ({ page }) => {
    await page.goto(`${BASE}/admin/audit`);
    await expect(page.getByRole('heading', { name: /Auditoria/i })).toBeVisible();
  });
});

test.describe('Student Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'aluno1@loja-a.local', 'Student@2026!');
  });

  test('student can see catalog', async ({ page }) => {
    await page.goto(`${BASE}/student/catalog`);
    await expect(page.getByRole('heading', { name: /Catálogo/i })).toBeVisible();
  });

  test('student can see trails', async ({ page }) => {
    await page.goto(`${BASE}/student/trails`);
    await expect(page.getByRole('heading', { name: /Trilhas/i })).toBeVisible();
  });

  test('STUDENT cannot access admin routes', async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    // Should be redirected away from admin
    await expect(page).not.toHaveURL(`${BASE}/admin`, { timeout: 5000 });
  });
});

test.describe('STORE_ADMIN restrictions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin-a@compliance.local', 'Admin@2026!');
  });

  test('STORE_ADMIN can see users', async ({ page }) => {
    await page.goto(`${BASE}/admin/users`);
    await expect(page.getByRole('heading', { name: /Usuários/i })).toBeVisible();
  });

  test('STORE_ADMIN sidebar does not show Lojas link', async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    // Stores link should not be visible for STORE_ADMIN
    const storesLink = page.getByRole('link', { name: /^Lojas$/ });
    await expect(storesLink).not.toBeVisible();
  });
});
