---
description: Design system and accessibility conventions
paths:
  - "src/app/**/*.tsx"
  - "src/components/**"
---

- Colors, spacing, and type come from the `@theme` tokens in `src/app/globals.css` — no raw hex
  or arbitrary Tailwind values (`bg-[#123456]`) in a component.
- Every status indicator (verificado/pendiente) pairs color with an icon and a text label — never
  color alone (WCAG 1.4.1).
- Buttons on `/registro`, `/mi-ticket`, and `/verificar` are at least 56px tall — these are used
  standing up, on a phone, often in a hurry.
- Every icon-only button has an `aria-label`.
- Camera/scan feedback (`/verificar`) flashes both a color and an icon/text change on success and
  on failure — color-blind station staff must be able to tell the two apart without the color.
