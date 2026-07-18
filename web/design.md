# MIKS web design system

**Source**: extracted-from-code (`src/index.css`, `components.json`), 2026-07-18, alongside the frontend foundation build ([spec 0001](../docs/specs/web/0001-frontend-architecture/index.md)).

## Character

A financial product for group savings and shared projects, targeting Madagascar first. The palette is a cool, trustworthy blue-grey (`--primary` around `oklch(0.56 0.18 250)`, a mid-toned blue) paired with a warm amber-orange accent (`--accent`, `oklch(0.72 0.19 50)`) that echoes the brand mark's gradient (brown-to-orange, green-to-blue, blue-to-green, see `src/components/brand/logo.tsx`). Calm and professional, not playful; an accent used sparingly for emphasis (primary actions, active states), never as a base color.

## Build mandate

- Full product surfaces, never a bare form on an empty page: a login/auth screen gets a branded panel (logo, product context) beside the form, not a lone centered card.
- Every screen has loading, error, and empty states.
- Dark mode via the `.dark` class (already wired in `src/index.css`); build both palettes together, never one and forget the other.
- shadcn/ui (`new-york` style) + Tailwind v4 tokens; use installed primitives (`src/components/ui/`) over hand rolled markup.
- Geist Variable is the sans font; no secondary display font introduced without a reason.

## Tokens

Token values live in `src/index.css` (`:root` / `.dark` custom properties, mapped via `@theme inline`). This file only records direction; do not duplicate values here. `components.json` pins the shadcn config (`new-york`, `neutral` base, CSS variables on, aliases under `#/`).
