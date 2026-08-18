import { describe, expect, it } from 'vitest';
import { SENUHU_BANK_RATE_GTQ_PER_USD, summarizeTripExpenses } from './tripExpenses';

describe('summarizeTripExpenses', () => {
  it('keeps USD and quetzal purchases distinct while converting the combined amount with the saved Senahú rate', () => {
    const summary = summarizeTripExpenses([
      { id: 'usd', description: 'Supplies', usdAmount: 100 },
      { id: 'gtq', description: 'Meals', quetzalAmount: 741 },
    ], { expenseDivisor: 4 });

    expect(summary.quetzalesPerUsd).toBe(SENUHU_BANK_RATE_GTQ_PER_USD);
    expect(summary.usdPurchases).toBe(100);
    expect(summary.quetzalPurchases).toBe(741);
    expect(summary.combinedUsd).toBe(200);
    expect(summary.perPersonUsd).toBe(50);
  });

  it('uses a persisted per-trip rate and leaves the per-person amount blank until a divisor is entered', () => {
    const summary = summarizeTripExpenses([{ id: 'gtq', description: 'Transport', quetzalAmount: 800 }], { quetzalesPerUsd: 8 });
    expect(summary.combinedUsd).toBe(100);
    expect(summary.perPersonUsd).toBeNull();
  });
});
