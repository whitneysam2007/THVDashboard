import { describe, it, expect } from 'vitest';
import { taskRowId, taskSlugFromRowId, isManualTaskId } from '../shared/taskKeys';

const DONOR_A = 'FS0U40MHLGWSroJQSjZTN'; // USANA Foundation
const DONOR_B = '27HfZZcZThffphc1Lc93P'; // Marriott Foundation

describe('task key scoping', () => {
  it('gives two different donors DISTINCT keys for the same auto-task slug', () => {
    // This is the exact bug: both donors previously wrote to the row id "newsletter",
    // so donor B completing it overwrote donor A's row and stole the task.
    const a = taskRowId(DONOR_A, 'newsletter');
    const b = taskRowId(DONOR_B, 'newsletter');
    expect(a).not.toBe(b);
    expect(a).toBe(`${DONOR_A}_newsletter`);
    expect(b).toBe(`${DONOR_B}_newsletter`);
  });

  it('is idempotent — re-scoping an already scoped key does not double-prefix', () => {
    const once = taskRowId(DONOR_A, 'welcome-note');
    const twice = taskRowId(DONOR_A, once);
    expect(twice).toBe(once);
    expect(twice).toBe(`${DONOR_A}_welcome-note`);
  });

  it('leaves manual task ids untouched (they are already globally unique)', () => {
    const manual = 'manual-iPVwFm7lH8MJtaUydJrqJ';
    expect(isManualTaskId(manual)).toBe(true);
    expect(taskRowId(DONOR_A, manual)).toBe(manual);
    expect(taskSlugFromRowId(DONOR_A, manual)).toBe(manual);
  });

  it('round-trips a slug through scope and back', () => {
    for (const slug of ['newsletter', 'welcome-note', 'donation-acknowledgment', 'annual-report-2026', 'tax-receipt-2026']) {
      const rowId = taskRowId(DONOR_A, slug);
      expect(taskSlugFromRowId(DONOR_A, rowId)).toBe(slug);
    }
  });

  it('recovers the slug even for auto-task slugs containing underscores or digits', () => {
    const slug = 'annual_report_2027';
    const rowId = taskRowId(DONOR_B, slug);
    expect(rowId).toBe(`${DONOR_B}_annual_report_2027`);
    expect(taskSlugFromRowId(DONOR_B, rowId)).toBe(slug);
  });

  it('does not strip a prefix belonging to a different donor', () => {
    const rowId = taskRowId(DONOR_A, 'newsletter');
    // Reading donor B's scope against donor A's row must not mangle the id
    expect(taskSlugFromRowId(DONOR_B, rowId)).toBe(rowId);
  });
});
