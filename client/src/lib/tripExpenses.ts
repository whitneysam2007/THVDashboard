import type { TripExpense, TripOperations } from '../../../shared/tripOperations';

export const SENUHU_BANK_RATE_GTQ_PER_USD = 7.41;

export function summarizeTripExpenses(expenses: TripExpense[], operations: TripOperations) {
  const quetzalesPerUsd = operations.quetzalesPerUsd ?? SENUHU_BANK_RATE_GTQ_PER_USD;
  const usdPurchases = expenses.reduce((sum, expense) => sum + (expense.usdAmount ?? 0), 0);
  const quetzalPurchases = expenses.reduce((sum, expense) => sum + (expense.quetzalAmount ?? 0), 0);
  const convertedQuetzalUsd = quetzalesPerUsd > 0 ? quetzalPurchases / quetzalesPerUsd : 0;
  const combinedUsd = usdPurchases + convertedQuetzalUsd;
  const divisor = operations.expenseDivisor ?? 0;
  return {
    quetzalesPerUsd,
    usdPurchases,
    quetzalPurchases,
    combinedUsd,
    expenseDivisor: divisor,
    perPersonUsd: divisor > 0 ? combinedUsd / divisor : null,
  };
}
