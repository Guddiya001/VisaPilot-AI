/**
 * Normalizes candidate profile values (dates, phone numbers) into target ATS field masks.
 */

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export interface NormalizerOptions {
  fieldType?: string;
  formatMask?: string;
}

export function normalizeFieldValue(
  rawValue: string,
  options: NormalizerOptions = {}
): string {
  const { formatMask } = options;
  if (!rawValue || !formatMask) return rawValue;

  const trimmed = rawValue.trim();

  // 1. Date normalization (e.g. 2023-10-01)
  const isoDateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const dateMatch = trimmed.match(isoDateRegex);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    const monthNum = parseInt(month, 10);
    const monthName = MONTH_NAMES[monthNum - 1] || month;

    switch (formatMask) {
      case 'MM/YYYY':
        return `${month}/${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'YYYY-MM':
        return `${year}-${month}`;
      case 'MONTH_NAME_AND_YEAR':
        return `${monthName} ${year}`;
      case 'FULL_TEXT':
        return `${monthName} ${parseInt(day, 10)}, ${year}`;
      default:
        return trimmed;
    }
  }

  // 2. Phone normalization (e.g. +91-9876543210)
  if (formatMask === 'E.164_CLEAN') {
    // Preserve leading plus, strip spaces, dashes, parentheses
    const hasPlus = trimmed.startsWith('+');
    const digits = trimmed.replace(/\D/g, '');
    return hasPlus ? `+${digits}` : digits;
  }

  return trimmed;
}
