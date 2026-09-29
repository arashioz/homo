# Tailwind CSS migration plan

## Phase 0 - Already done

- Tailwind CSS v4 is installed.
- `postcss.config.mjs` uses `@tailwindcss/postcss`.
- `src/app/globals.css` imports Tailwind with `@import "tailwindcss";`.

## Phase 1 - Shell and shared public UI

- Move the public navigation and footer to Tailwind utility classes.
- Keep legacy class names only where they are needed for behavior or admin hiding.
- Do not touch CRM/admin styles in this phase.

## Phase 2 - Product pages

- Move product cards, product detail layout, buy box, and product AI panel to Tailwind.
- Reduce equivalent rules from `globals.css` after visual parity.

## Phase 3 - Homepage

- Move hero, banners, categories, showcase, and estimator to Tailwind.
- Keep complex animations as small named CSS keyframes until they are stable.

## Phase 4 - CSS split and cleanup

- Split any remaining legacy CSS by ownership: public site, admin, print/invoice.
- Delete unused selectors after each route is verified.

## Phase 5 - CRM separately

- Treat `apps/crm-frontend` as a separate migration because it uses Ionic/Vite and has its own UI constraints.
