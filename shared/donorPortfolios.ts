export const DONOR_PORTFOLIOS = ['major', 'donors-500-5k', 'monthly-giving'] as const;
const PORTFOLIO_TAG_PREFIX = 'thv-portfolio:';

export type DonorPortfolio = typeof DONOR_PORTFOLIOS[number];

export function normalizeDonorPortfolio(value: unknown): DonorPortfolio {
  return DONOR_PORTFOLIOS.includes(value as DonorPortfolio)
    ? value as DonorPortfolio
    : 'major';
}

export function donorPortfolioLabel(portfolio: DonorPortfolio) {
  return {
    major: 'Major Donors',
    'donors-500-5k': 'Donors 500–5K',
    'monthly-giving': 'Monthly Giving',
  }[portfolio];
}

function asTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((tag): tag is string => typeof tag === 'string');
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : [];
  } catch {
    return [];
  }
}

export function portfolioFromTags(value: unknown): DonorPortfolio {
  const tag = asTags(value).find(item => item.startsWith(PORTFOLIO_TAG_PREFIX));
  return normalizeDonorPortfolio(tag?.slice(PORTFOLIO_TAG_PREFIX.length));
}

export function tagsWithPortfolio(value: unknown, portfolio: DonorPortfolio) {
  return [...asTags(value).filter(tag => !tag.startsWith(PORTFOLIO_TAG_PREFIX)), `${PORTFOLIO_TAG_PREFIX}${portfolio}`];
}

export function tagsWithoutPortfolio(value: unknown) {
  return asTags(value).filter(tag => !tag.startsWith(PORTFOLIO_TAG_PREFIX));
}
