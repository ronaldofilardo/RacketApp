import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Autenticar via localStorage para pular tela de login durante E2E
    await page.addInitScript(() => {
      try { localStorage.setItem('racket_auth', 'true'); } catch { /* ignore */ }
    });
    // Aceitar automaticamente quaisquer dialogs/alerts para não bloquear os testes
    page.on('dialog', async dialog => {
      try { await dialog.accept(); } catch { /* ignore */ }
    });
  });
  test('should load dashboard and display matches', async ({ page }) => {
    await page.goto('/');

    // Verificar se o dashboard carregou
    await expect(page).toHaveTitle(/Racket/);

    // Verificar se há elementos da dashboard
    const dashboardElement = page.locator('[data-testid="dashboard"]');
    await expect(dashboardElement).toBeVisible();
  });

  test('should create and start a match', async ({ page }) => {
    await page.goto('/');

    // Clicar em "Nova Partida"
    await page.click('text=Nova Partida');

    // Preencher jogadores (suporta <select> ou <input>)
    const p1 = page.locator('[data-testid="player1-input"]');
    const p2 = page.locator('[data-testid="player2-input"]');
    const p1Tag = await p1.evaluate(e => e.tagName.toLowerCase());
    if (p1Tag === 'select') {
      const val = await p1.evaluate((el: HTMLSelectElement) => Array.from(el.options).map(o => o.value).find(v => v !== ''));
      if (val) await p1.selectOption(val);
    } else {
      await p1.fill('João');
    }
    const p2Tag = await p2.evaluate(e => e.tagName.toLowerCase());
    if (p2Tag === 'select') {
      const val2 = await p2.evaluate((el: HTMLSelectElement) => Array.from(el.options).map(o => o.value).find(v => v !== ''));
      if (val2) await p2.selectOption(val2);
    } else {
      await p2.fill('Maria');
    }

    // Selecionar formato
    await page.selectOption('[data-testid="format-select"]', 'BEST_OF_3');

    // Iniciar partida
    await page.click('text=Iniciar Partida');

    // Aguardar setup modal aparecer e escolher servidor
    await page.waitForSelector('text=Configuração da Partida', { timeout: 5000 });
    const serverButtons = page.locator('button:has-text("🎾")');
    await serverButtons.first().click();

  // Verificar elementos do scoreboard (app SPA pode não alterar URL)
  await page.waitForSelector('[data-testid="scoreboard-header"]', { timeout: 10000 });
  await expect(page.locator('[data-testid="scoreboard-header"]')).toBeVisible();
  });

  test('should simulate a complete match', async ({ page }) => {
    await page.goto('/');

    // Criar partida rapidamente
    await page.click('text=Nova Partida');
    // Preencher jogadores (suporta <select> ou <input>)
    const p1b = page.locator('[data-testid="player1-input"]');
    const p2b = page.locator('[data-testid="player2-input"]');
    const p1bTag = await p1b.evaluate(e => e.tagName.toLowerCase());
    if (p1bTag === 'select') {
      const v = await p1b.evaluate((el: HTMLSelectElement) => Array.from(el.options).map(o => o.value).find(v => v !== ''));
      if (v) await p1b.selectOption(v);
    } else {
      await p1b.fill('Ana');
    }
    const p2bTag = await p2b.evaluate(e => e.tagName.toLowerCase());
    if (p2bTag === 'select') {
      const v2 = await p2b.evaluate((el: HTMLSelectElement) => Array.from(el.options).map(o => o.value).find(v => v !== ''));
      if (v2) await p2b.selectOption(v2);
    } else {
      await p2b.fill('Carlos');
    }
    await page.selectOption('[data-testid="format-select"]', 'BEST_OF_3');
    await page.click('text=Iniciar Partida');

    // Aguardar setup modal aparecer e escolher servidor
    await page.waitForSelector('text=Configuração da Partida', { timeout: 5000 });
    const serverButtons = page.locator('button:has-text("🎾")');
    await serverButtons.first().click();

    // Aguardar carregamento
    await page.waitForSelector('[data-testid="scoreboard-header"]');

    // Simular pontos até finalizar
    // Jogador 1 ganha primeiro set (6-0) - cada game precisa de ~4-8 cliques
    for (let i = 0; i < 48; i++) { // Aumentar para garantir vitória
      await page.click('[data-testid="point-button-p1"]');
      await page.waitForTimeout(100); // Pequena pausa entre cliques
    }

    // Verificar se partida terminou
    await expect(page.locator('text=RESULTADO FINAL')).toBeVisible();
    await expect(page.locator('text=VENCEU')).toBeVisible();
  });
});