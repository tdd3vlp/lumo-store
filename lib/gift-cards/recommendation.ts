export type GiftCardOption = {
  id: string;
  amount: number;
  salePriceMinor: number | null;
};

export type GiftCardSelection = GiftCardOption & {
  quantity: number;
};

export type GiftCardRecommendation = {
  cards: GiftCardSelection[];
  balance: number;
  remainder: number;
  salePriceMinor: number | null;
};

export function recommendGiftCards(
  total: number,
  options: GiftCardOption[],
): GiftCardRecommendation | null {
  if (total <= 0 || options.length === 0) return null;

  const sorted = [...options].sort((a, b) => a.amount - b.amount);
  const maxAmount = sorted.at(-1)?.amount ?? 0;
  const searchLimit = total + maxAmount;
  const best: Array<{ count: number; previous: number; optionIndex: number } | null> =
    Array(searchLimit + 1).fill(null);
  best[0] = { count: 0, previous: -1, optionIndex: -1 };

  for (let balance = 0; balance <= searchLimit; balance += 1) {
    const state = best[balance];
    if (!state) continue;

    sorted.forEach((option, optionIndex) => {
      const nextBalance = balance + option.amount;
      if (nextBalance > searchLimit) return;

      const nextCount = state.count + 1;
      if (!best[nextBalance] || nextCount < best[nextBalance]!.count) {
        best[nextBalance] = {
          count: nextCount,
          previous: balance,
          optionIndex,
        };
      }
    });
  }

  let selectedBalance = -1;
  for (let balance = Math.ceil(total); balance <= searchLimit; balance += 1) {
    if (best[balance]) {
      selectedBalance = balance;
      break;
    }
  }

  if (selectedBalance < 0) return null;

  const quantities = new Map<number, number>();
  let cursor = selectedBalance;
  while (cursor > 0) {
    const state = best[cursor];
    if (!state || state.optionIndex < 0) break;
    quantities.set(state.optionIndex, (quantities.get(state.optionIndex) ?? 0) + 1);
    cursor = state.previous;
  }

  const cards = [...quantities.entries()]
    .map(([optionIndex, quantity]) => ({ ...sorted[optionIndex], quantity }))
    .sort((a, b) => b.amount - a.amount);
  const hasCompletePricing = cards.every((card) => card.salePriceMinor !== null);
  const salePriceMinor = hasCompletePricing
    ? cards.reduce(
        (sum, card) => sum + (card.salePriceMinor ?? 0) * card.quantity,
        0,
      )
    : null;

  return {
    cards,
    balance: selectedBalance,
    remainder: selectedBalance - total,
    salePriceMinor,
  };
}

