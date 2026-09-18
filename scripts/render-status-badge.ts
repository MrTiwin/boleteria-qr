import { renderToStaticMarkup } from "react-dom/server";
import { StatusBadge } from "../src/components/status-badge.tsx";

// Run via `tsx` (never via Playwright's own TSX loader — see
// tests/e2e/accessibility.spec.ts for why: Playwright injects its own JSX runtime for .tsx files,
// meant for its component-testing harness, which produces objects react-dom/server can't render).
// tsx uses the standard React JSX runtime, so this renders the real component, not a hand-copied
// approximation of it.
process.stdout.write(
  renderToStaticMarkup(StatusBadge({ variant: "verified" })),
);
