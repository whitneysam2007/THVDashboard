import { describe, expect, it } from 'vitest';
import { donorPortfolioLabel, normalizeDonorPortfolio, portfolioFromTags, tagsWithPortfolio } from './donorPortfolios';

describe('donor portfolios', () => {
  it('normalizes legacy donor rows to the major donor portfolio', () => {
    expect(normalizeDonorPortfolio(undefined)).toBe('major');
    expect(normalizeDonorPortfolio('unknown')).toBe('major');
  });

  it('keeps each supported portfolio distinct', () => {
    expect(normalizeDonorPortfolio('donors-500-5k')).toBe('donors-500-5k');
    expect(normalizeDonorPortfolio('monthly-giving')).toBe('monthly-giving');
    expect(donorPortfolioLabel('monthly-giving')).toBe('Monthly Giving');
  });

  it('stores a single portfolio assignment without losing unrelated tags', () => {
    const tags = tagsWithPortfolio(['naru-circle', 'thv-portfolio:major'], 'monthly-giving');
    expect(tags).toEqual(['naru-circle', 'thv-portfolio:monthly-giving']);
    expect(portfolioFromTags(tags)).toBe('monthly-giving');
  });
});
