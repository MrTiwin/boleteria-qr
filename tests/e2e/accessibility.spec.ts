import { execFileSync } from "node:child_process";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Resolved from node_modules/.bin rather than invoked via `pnpm exec` — the child process
// spawned here does not inherit this shell's PATH, so a bare "pnpm" is not found even though it
// works when run by hand.
const TSX_BIN = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx",
);

const PAGES = ["/registro", "/mi-ticket", "/verificar"];

for (const route of PAGES) {
  test(`${route} has 0 axe violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("/registro shows no horizontal scroll at 375px wide", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/registro");

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("a status badge renders both a text label and an icon element, never color alone", async ({
  page,
}) => {
  // Rendered in a separate `tsx` process, never through Playwright's own TSX loader — see
  // scripts/render-status-badge.ts for why.
  // shell:true is required on Windows to execute a .cmd shim directly (EINVAL otherwise). Node
  // warns (DEP0190) that shell args aren't escaped when shell:true — safe here, both the binary
  // path and the script path are fixed literals, never user input.
  const html = execFileSync(TSX_BIN, ["scripts/render-status-badge.ts"], {
    encoding: "utf-8",
    shell: process.platform === "win32",
  });
  await page.setContent(`<div id="root">${html}</div>`);

  const badge = page.locator("#root span");
  await expect(badge).toContainText("Verificado");
  await expect(badge.locator("svg")).toHaveCount(1);
  await expect(badge.locator("svg")).toHaveAttribute("aria-hidden", "true");
});
