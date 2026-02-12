import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("should show login form by default", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h2", { hasText: "Connexion Admin" })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("should show error with empty fields", async ({ page }) => {
    await page.goto("/");
    await page.locator('button[type="submit"]').click();
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute("required", "");
  });

  test("should have link to vendor registration", async ({ page }) => {
    await page.goto("/");
    const link = page.locator('a[href="/se-proposer-fournisseur"]');
    await expect(link).toBeVisible();
  });

  test("should show error with wrong credentials", async ({ page }) => {
    await page.goto("/");
    await page.locator('input[type="email"]').fill("wrong@test.com");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator(".alert-error")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Vendor Registration Form (Public)", () => {
  test("should load the vendor form page", async ({ page }) => {
    await page.goto("/se-proposer-fournisseur");
    await expect(page.locator("h2", { hasText: "Demande Fournisseur" })).toBeVisible();
  });

  test("should show step 1 fields", async ({ page }) => {
    await page.goto("/se-proposer-fournisseur");
    await expect(page.locator('input[name="emailDemandeur"]')).toBeVisible();
    await expect(page.locator('select[name="equipUtilisatrice"]')).toBeVisible();
    await expect(page.locator('select[name="integrationOuRetrait"]')).toBeVisible();
  });

  test("should show dependance cards on step 1", async ({ page }) => {
    await page.goto("/se-proposer-fournisseur");
    await expect(page.locator(".dimension-label", { hasText: "Niveau de Dependance" })).toBeVisible();
    const cards = page.locator(".dimension-card");
    await expect(cards).toHaveCount(4);
  });

  test("should have cancel button that navigates back", async ({ page }) => {
    await page.goto("/se-proposer-fournisseur");
    const cancelBtn = page.locator(".btn-cancel-link");
    await expect(cancelBtn).toBeVisible();
    await expect(cancelBtn).toHaveText(/Annuler/);
  });

  test("should disable Continue until required fields filled", async ({ page }) => {
    await page.goto("/se-proposer-fournisseur");
    const continueBtn = page.locator('button', { hasText: "Continuer" });
    await expect(continueBtn).toBeDisabled();
  });

  test("should enable Continue after filling required step 1 fields", async ({ page }) => {
    await page.goto("/se-proposer-fournisseur");
    await page.locator('input[name="emailDemandeur"]').fill("test@example.com");
    await page.locator('select[name="equipUtilisatrice"]').selectOption("Developpement/IT");
    await page.locator('select[name="integrationOuRetrait"]').selectOption("Integration");
    await page.locator(".dimension-card.dep-2").click();
    const continueBtn = page.locator('button', { hasText: "Continuer" });
    await expect(continueBtn).toBeEnabled();
  });

  test("should navigate to step 2 after Continue", async ({ page }) => {
    await page.goto("/se-proposer-fournisseur");
    await page.locator('input[name="emailDemandeur"]').fill("test@example.com");
    await page.locator('select[name="equipUtilisatrice"]').selectOption("Developpement/IT");
    await page.locator('select[name="integrationOuRetrait"]').selectOption("Integration");
    await page.locator(".dimension-card.dep-2").click();
    await page.locator('button', { hasText: "Continuer" }).click();
    await expect(page.locator('input[name="nomFournisseur"]')).toBeVisible();
    await expect(page.locator('select[name="typePrestataire"]')).toBeVisible();
  });

  test("should have Retour button on step 2", async ({ page }) => {
    await page.goto("/se-proposer-fournisseur");
    await page.locator('input[name="emailDemandeur"]').fill("test@example.com");
    await page.locator('select[name="equipUtilisatrice"]').selectOption("Developpement/IT");
    await page.locator('select[name="integrationOuRetrait"]').selectOption("Integration");
    await page.locator(".dimension-card.dep-2").click();
    await page.locator('button', { hasText: "Continuer" }).click();
    const retourBtn = page.locator('button', { hasText: "Retour" });
    await expect(retourBtn).toBeVisible();
  });

  test("should not have pret a envoyer anywhere", async ({ page }) => {
    await page.goto("/se-proposer-fournisseur");
    const pageContent = await page.textContent("body");
    expect(pageContent.toLowerCase()).not.toContain("pret a envoyer");
    expect(pageContent.toLowerCase()).not.toContain("prêt à envoyer");
  });

  test("should complete full 6-step wizard", async ({ page }) => {
    await page.goto("/se-proposer-fournisseur");
    // Step 1
    await page.locator('input[name="emailDemandeur"]').fill("test@example.com");
    await page.locator('select[name="equipUtilisatrice"]').selectOption("Developpement/IT");
    await page.locator('select[name="integrationOuRetrait"]').selectOption("Integration");
    await page.locator(".dimension-card.dep-2").click();
    await page.locator('button', { hasText: "Continuer" }).click();
    // Step 2
    await page.locator('input[name="nomFournisseur"]').fill("TestCorp");
    await page.locator('select[name="typePrestataire"]').selectOption("Editeur de logiciel");
    await page.locator('button', { hasText: "Continuer" }).click();
    // Step 3
    await page.locator('input[name="typeServiceMateriel"]').fill("CRM");
    await page.locator('select[name="applicationActive"]').selectOption("Oui");
    await page.locator('button', { hasText: "Continuer" }).click();
    // Step 4
    await page.locator('button', { hasText: "Continuer" }).click();
    // Step 5
    await page.locator('button', { hasText: "Continuer" }).click();
    // Step 6 - Recap or Success (form may auto-submit via Firebase)
    const recapOrSuccess = page.locator("h2", { hasText: "Recapitulatif" }).or(page.locator("h1", { hasText: "Demande Soumise" }));
    await expect(recapOrSuccess).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Navigation", () => {
  test("should redirect unknown routes to login", async ({ page }) => {
    await page.goto("/unknown-route");
    await expect(page).toHaveURL("/");
  });

  test("should show login page for protected routes when not authenticated", async ({ page }) => {
    await page.goto("/admin/utilisateurs");
    await expect(page).toHaveURL("/");
  });

  test("should show login page for admin settings when not authenticated", async ({ page }) => {
    await page.goto("/admin/parametres");
    await expect(page).toHaveURL("/");
  });

  test("should show login page for risk matrix when not authenticated", async ({ page }) => {
    await page.goto("/risk-matrix");
    await expect(page).toHaveURL("/");
  });
});
