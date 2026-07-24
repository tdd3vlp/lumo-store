# Legacy game-card UI (reference only)

Snapshot of the game-catalog components as they looked before the store pivoted
from selling games to selling gift-card / top-up products. Kept so the game card
treatment — cover, price/discount, and the language/platform **badges**
(russian voice/subtitles, english voice/subtitles, platform) — can be brought
back if games are re-introduced later.

Extracted from git at commit `74eb949^` (the parent of the commit that removed
them); `GameGrid.tsx` from `a1988f4^`.

These files are **not compiled** — they are excluded from `tsconfig.json` and
import modules that no longer exist (`@/lib/pricing/context`, `editionCartId`,
the games API, etc.). Treat them as a visual/structural reference, not as
drop-in code.

Files:
- `GameCard.tsx` — the card itself, with favorite/cart actions and the badges.
- `GameRowSection.tsx` — horizontal row of game cards.
- `GameGrid.tsx` — grid layout.
- `GamePageClient.tsx` — full product page (editions, badges, gallery).
- `BudgetGamesSection.tsx` — budget-slider driven games section.
