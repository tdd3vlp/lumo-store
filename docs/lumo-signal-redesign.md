# Lumo Signal storefront redesign

## Objective

Rebuild the current storefront around the visual direction shown in:

- `docs/design-references/lumo-signal-desktop.png`
- `docs/design-references/lumo-signal-mobile.png`

The result should feel like the same product shown in the references, not a
loose recoloring of the current lavender interface.

The core product idea must become immediately obvious: the user chooses a PSN
gift-card budget, sees games that fit it, and understands how much balance will
remain.

## Before implementation

This project uses Next.js `16.2.4`. Before changing code, read the relevant
local documentation:

- `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`
- any additional App Router guide required by the implementation

Preserve the current server/client boundaries unless a change is necessary.
Do not replace working catalog fetching, cart state, favorites state, or
edition selection with mock-only behavior.

## Scope and priority

### Priority 1: must closely match the references

- `app/page.tsx`
- `components/Header.tsx`
- `components/GameCard.tsx`
- `components/GameRowSection.tsx`
- the new budget-selection experience
- `app/globals.css`
- `app/layout.tsx`

### Priority 2: carry the design system through existing pages

- `app/game/[id]/page.tsx`
- `app/cart/page.tsx`
- `app/favorites/page.tsx`
- `components/CartSidebar.tsx`, if it remains in use

Do not redesign API routes or catalog parsing unless required for the UI.

## Visual system

### Brand idea

Lumo Signal is an editorial gaming storefront with tactile print character:
warm paper, dense black surfaces, electric-lime signals, sharp typography,
light grain, and occasional hand-drawn marks.

It must not look like:

- a purple SaaS dashboard;
- a generic banking application;
- a neon cyberpunk interface;
- a glassmorphism template;
- a direct PlayStation or Sony clone.

### Color tokens

Define semantic CSS custom properties in `app/globals.css` and use them
consistently instead of scattering arbitrary hex values.

```css
--paper: #f4f0e7;
--paper-strong: #fffdf7;
--ink: #15131b;
--ink-soft: #242129;
--signal: #d8ff3e;
--signal-strong: #c8f500;
--coral: #ff6b57;
--sky: #78a8ff;
--text: #18161d;
--text-muted: #716b78;
--line: rgba(24, 22, 29, 0.16);
--line-inverse: rgba(255, 255, 255, 0.18);
```

Use signal lime for primary actions, selected budget, remaining balance,
active controls, and small brand sparks. Use coral only for discount labels,
destructive actions, and exceeded-budget states. Use sky blue for platform
chips and secondary links. Avoid purple as a principal UI color.

### Typography

Use `next/font/google`, following the local Next.js font guide.

- Display: `Unbounded`, weights 600–800.
- UI/body: `Onest`, variable or weights 400–700.

Apply both Latin and Cyrillic subsets when supported. Expose them as CSS
variables from `app/layout.tsx`.

Use Unbounded only for the wordmark, hero headline, major section headings,
and large numeric moments. Use Onest everywhere else. Avoid setting long body
copy in Unbounded.

Suggested hierarchy:

- hero: `clamp(2.6rem, 6vw, 5.5rem)`, tight line height;
- section heading: 24–32 px;
- card title: 15–18 px;
- price: 20–24 px, weight 700;
- metadata: 12–14 px.

### Shape and surface

- Use solid surfaces rather than translucent glass.
- Desktop page background is warm paper.
- Major hero and mobile navigation surfaces are ink black.
- Cards use warm white or ink black depending on their section.
- Primary radius: 16–20 px; avoid making every control pill-shaped.
- Use 1 px dark outlines on light surfaces and light outlines on dark surfaces.
- Shadows should be restrained and slightly hard, not large purple glows.
- Add a very subtle CSS grain/paper texture without loading a huge asset.
- Rough or torn edges may appear only on major editorial sections and should
  degrade gracefully; keep content geometry clean.

### Motion

- Keep motion short: 160–240 ms.
- Card hover: 2–4 px lift and slight cover zoom.
- Buttons may shift by 1–2 px and tighten their shadow.
- Respect `prefers-reduced-motion`.
- Do not autoplay large decorative motion.

## Home page structure

Replace the current carousel-led hierarchy. The budget tool is the hero.

### Header

Desktop:

- strong black `LUMO` wordmark with a small lime spark;
- black catalog button;
- wide central search field;
- favorites icon;
- cart control with count badge;
- sticky behavior is allowed, but keep it compact and solid enough to remain
  legible over the page.

Mobile:

- ink-black top area;
- wordmark, search icon, cart with lime count badge, and menu icon;
- full-width search field immediately below;
- menu should close after navigation and preserve accessible labels/focus.

The search UI must either filter visible home-page content or present usable
results. Do not retain a decorative search input that appears functional but
has no visible effect.

### Hero / budget builder

Build a dedicated client component, for example `BudgetHero.tsx`.

Desktop layout:

- large ink-black editorial panel;
- left: oversized heading `ИГРЫ НА ВЕСЬ ТВОЙ БАЛАНС`;
- left/bottom: interactive budget card;
- right: layered game covers from real project data;
- right/bottom: compact summary showing balance, chosen games, and remainder.

Mobile layout:

- headline and an expressive game visual share the dark hero;
- compact budget control overlays or follows the headline;
- the main CTA remains visible without excessive scrolling.

Budget behavior:

- default budget: ₹3000;
- the balance is changed with a prominent horizontal range slider;
- do not add `−` and `+` buttons for changing the Hero balance, even though
  they appear in the generated visual references;
- display the currently selected amount as a large value directly above the
  slider and update it immediately while the thumb is moving;
- the slider should snap to supported gift-card denominations rather than
  produce arbitrary values;
- clamp to a safe range;
- derive remainder from actual selected/cart content when applicable;
- CTA scrolls to or refreshes the budget-matching collection;
- state must be understandable with keyboard and screen reader use.

Suggested denominations:

```ts
[1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 12000]
```

Implement the slider with an accessible native `input[type="range"]` or an
equally accessible control. Show several scale labels under the track without
overcrowding it. The filled section of the track and the thumb use signal
lime. Arrow keys must change the selected denomination. Add an explicit
Russian accessible name such as `Желаемый баланс`.

The page should not claim that every game is under the budget. Filter or label
results truthfully.

### Product sections

The first section is `Игры под твой бюджет`.

- light paper background directly after the dark hero;
- heading with small editorial spark;
- `Смотреть все` link on desktop, arrow action on mobile;
- horizontal rail on narrow screens;
- desktop should show approximately five or six useful cards at 1440 px;
- preserve additional sections such as new releases and deals, but vary their
  surface or density to create rhythm.

Add a compact trust strip below the first collection on desktop:

- `Надёжные покупки`;
- `Моментальная доставка`;
- `Выгодные цены`;
- `Поддержка`.

Do not invent legal guarantees that the product cannot actually provide. If
these claims are not valid, replace them with factual product benefits.

## Game card specification

The game card should closely follow the desktop reference.

### Content order

1. cover art with a stable portrait ratio;
2. discount badge in the upper-left when `originalPrice > price`;
3. favorite action in the upper-right;
4. platform chip;
5. two-line game title;
6. current price and optional struck-through original price;
7. budget remainder row when a budget is selected.

### Appearance

- warm-white body;
- dark 1 px outline;
- 16–18 px outer radius;
- image fills the upper portion with no lavender overlay;
- lime remainder row separated by a subtle rule;
- platform chip uses sky blue;
- discount badge uses coral;
- favorite button must have visible default, hover, focus, and selected states.

### Data and calculations

- Never render the literal string `null`.
- When the price is unavailable, show `Цена недоступна`, omit discount and
  remainder, and disable price-dependent actions.
- Discount percentage:

```ts
Math.round((1 - price / originalPrice) * 100)
```

- Remainder:

```ts
Math.max(0, selectedBudget - price)
```

- Clearly distinguish:
  - fits budget;
  - exactly uses budget;
  - exceeds budget;
  - unavailable price.

### Interaction

- clicking the card opens the game page;
- favorite and quick-add actions must not accidentally trigger card navigation;
- all icon-only buttons require Russian `aria-label` text;
- provide strong `:focus-visible` treatment using signal lime and ink.

## Game details

Keep the design system consistent:

- ink hero area with the cover and large title;
- warm-paper purchase panel;
- edition selector styled like solid outlined tickets, not lavender pills;
- price and discount become the strongest content after the title;
- show how the selected edition fits the chosen budget;
- mobile purchase action should remain easy to reach;
- screenshots stay below and can retain Swiper.

Do not distort portrait covers into wide banners. Use a proper cover plus a
separate background treatment if needed.

## Cart

Use the mobile reference as the behavioral model:

- item list first;
- clear budget title;
- segmented balance bar showing used and remaining amounts;
- suggested gift-card denomination;
- recommendations that fit the remainder;
- sticky mobile action bar;
- specific CTA copy such as `Продолжить с картой ₹3000`.

Keep quantity controls if duplicates are still a valid product behavior.

## Favorites

- reuse the same card component or a clearly related compact variant;
- empty state needs a concise explanation and link back to the catalog;
- remove old lavender shadows and generic white-glass containers.

## Responsive requirements

Validate at minimum:

- 360 × 800;
- 390 × 844;
- 768 × 1024;
- 1280 × 800;
- 1440 × 900.

No horizontal page overflow. Horizontal product rails are acceptable. Keep
touch targets at least 44 × 44 px. The hero should not consume the entire
mobile viewport before the user sees products.

## Accessibility and quality

- preserve semantic headings;
- all controls work with keyboard navigation;
- visible `focus-visible` styles;
- text contrast must remain readable on paper, black, lime, and coral;
- honor reduced motion;
- meaningful image `alt` text;
- avoid layout shift for game art;
- prefer `next/image` for production images and configure exact remote patterns
  in `next.config.ts` according to the local Next.js image guide;
- add loading and error states where live prices are involved.

## Implementation guidance

Prefer small reusable components over one large home-page component. A
reasonable split could be:

- `BudgetHero`;
- `BudgetSelector`;
- `BudgetSummary`;
- `GameCard`;
- `GameRowSection`;
- `TrustStrip`;
- small shared icons.

Extend the Zustand store only for UI state that must persist across routes,
such as selected budget. Keep transient presentation state local.

Do not introduce another component framework. Tailwind 4 and focused global
CSS are sufficient.

## Acceptance criteria

- The first viewport unmistakably matches the Lumo Signal references.
- The page is predominantly warm paper, ink black, and electric lime.
- The current lavender/glass visual language is removed from priority surfaces.
- The Hero balance is controlled by a functional range slider, not `− / +`
  buttons, and directly affects visible information.
- Cards include platform, discount, price, favorite, and budget-fit status.
- No `null` price string reaches the UI.
- Desktop and mobile layouts both resemble their corresponding references.
- Existing catalog fetching, game links, favorites, cart, and edition behavior
  continue to work.
- `npm run lint` passes.
- `npm run build` passes.
- The implementation is checked visually at the listed viewport sizes.

## Reference-image caveat

The reference images are generated design mockups. Their game names, prices,
logos, spelling, and calculations are illustrative. Copy their visual system
and layout logic, but always use real project data and correct calculations.
