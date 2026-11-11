import type { PlanSubject } from '../api/studyPlans';

interface HistorySubject {
  code?: string;
  name?: string;
}

const ROMAN_NUMERALS: Record<string, string> = {
  i: '1',
  ii: '2',
  iii: '3',
  iv: '4',
};

function normalizeCode(value: string): string {
  const code = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return /^\d+$/.test(code) ? code.replace(/^0+(?=\d)/, '') : code;
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(iv|iii|ii|i)\b/g, numeral => ROMAN_NUMERALS[numeral])
    .split(/\s+/)
    .filter(word => !['el', 'la', 'los', 'las'].includes(word))
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function matchHistorySubject(
  historySubject: HistorySubject,
  subjects: PlanSubject[],
  getSubjectName: (subject: PlanSubject) => string,
): PlanSubject | null {
  const code = historySubject.code ? normalizeCode(historySubject.code) : '';
  if (code) {
    const matches = subjects.filter(
      subject => subject.code && normalizeCode(subject.code) === code,
    );
    if (matches.length === 1) return matches[0];
  }

  const name = historySubject.name ? normalizeName(historySubject.name) : '';
  if (!name) return null;
  const matches = subjects.filter(subject => normalizeName(getSubjectName(subject)) === name);
  return matches.length === 1 ? matches[0] : null;
}
