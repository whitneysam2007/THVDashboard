export const THANK_YOU_LETTER_LABEL = 'Handwritten thank-you card';

export function thankYouLetterTaskId(year: number) {
  return `thank-you-letter-${year}`;
}

export function isThankYouLetterTaskId(id: string, year: number) {
  return id === thankYouLetterTaskId(year) || id.endsWith(`_${thankYouLetterTaskId(year)}`);
}
