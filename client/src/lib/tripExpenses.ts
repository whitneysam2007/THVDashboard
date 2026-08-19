import type { TripExpense, TripOperations } from '../../../shared/tripOperations';

export const SENUHU_BANK_RATE_GTQ_PER_USD = 7.41;

export function summarizeTripExpenses(expenses: TripExpense[], operations: TripOperations) {
  const quetzalesPerUsd = operations.quetzalesPerUsd ?? SENUHU_BANK_RATE_GTQ_PER_USD;
  const usdPurchases = expenses.reduce((sum, expense) => sum + (expense.usdAmount ?? 0), 0);
  const quetzalPurchases = expenses.reduce((sum, expense) => sum + (expense.quetzalAmount ?? 0), 0);
  const convertedQuetzalUsd = quetzalesPerUsd > 0 ? quetzalPurchases / quetzalesPerUsd : 0;
  const combinedUsd = usdPurchases + convertedQuetzalUsd;
  const categoryTotals = Object.values(expenses.reduce<Record<string, { category: string; usdPurchases: number; quetzalPurchases: number; combinedUsd: number }>>((totals, expense) => {
    const category = expense.category ?? 'Uncategorized';
    const existing = totals[category] ?? { category, usdPurchases: 0, quetzalPurchases: 0, combinedUsd: 0 };
    const expenseUsd = (expense.usdAmount ?? 0) + (quetzalesPerUsd > 0 ? (expense.quetzalAmount ?? 0) / quetzalesPerUsd : 0);
    totals[category] = { category, usdPurchases: existing.usdPurchases + (expense.usdAmount ?? 0), quetzalPurchases: existing.quetzalPurchases + (expense.quetzalAmount ?? 0), combinedUsd: existing.combinedUsd + expenseUsd };
    return totals;
  }, {})).sort((first, second) => second.combinedUsd - first.combinedUsd || first.category.localeCompare(second.category));
  const divisor = operations.expenseDivisor ?? 0;
  return {
    quetzalesPerUsd,
    usdPurchases,
    quetzalPurchases,
    combinedUsd,
    categoryTotals,
    expenseDivisor: divisor,
    perPersonUsd: divisor > 0 ? combinedUsd / divisor : null,
  };
}
