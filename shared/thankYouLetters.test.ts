import { describe, expect, it } from 'vitest';
import { isThankYouLetterTaskId, thankYouLetterTaskId } from './thankYouLetters';

describe('thank-you letter task keys', () => {
  it('uses one stable task key per calendar year', () => {
    expect(thankYouLetterTaskId(2026)).toBe('thank-you-letter-2026');
  });

  it('recognizes both task slugs and donor-scoped database keys', () => {
    expect(isThankYouLetterTaskId('thank-you-letter-2026', 2026)).toBe(true);
    expect(isThankYouLetterTaskId('donor-123_thank-you-letter-2026', 2026)).toBe(true);
    expect(isThankYouLetterTaskId('thank-you-letter-2025', 2026)).toBe(false);
  });
});
