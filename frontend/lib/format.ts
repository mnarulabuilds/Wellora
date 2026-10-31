/** Pure formatting & conversion helpers (fully unit tested). */

export const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
export const lbsToKg = (lbs: number) => Math.round((lbs / 2.20462) * 10) / 10;
export const cmToInches = (cm: number) => Math.round((cm / 2.54) * 10) / 10;
export const inchesToCm = (inches: number) => Math.round(inches * 2.54 * 10) / 10;

export const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

/** Local calendar date as YYYY-MM-DD (not UTC, so late-evening logs land on the right day). */
export function localISODate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local wall-clock timestamp without timezone, e.g. 2026-05-01T08:30:00 (what the API stores). */
export function localISODateTime(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${localISODate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** "Today", "Yesterday", or e.g. "Mon, 3 Mar". */
export function formatRelativeDay(isoDate: string, now: Date = new Date()): string {
  const target = isoDate.slice(0, 10);
  const today = localISODate(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (target === today) return 'Today';
  if (target === localISODate(yesterday)) return 'Yesterday';
  const [y, m, d] = target.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "08:30" -> "8:30 AM" */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Validates & normalises "8:5", "0830", "8.30" style input to "08:30"; null if invalid. */
export function normaliseTime(input: string): string | null {
  const cleaned = input.trim().replace(/[.\s]/g, ':');
  const match = cleaned.match(/^(\d{1,2}):?(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const ACTIVITY_UNITS = { meal: 'kcal', workout: 'min', water: 'L' } as const;

export function formatActivityValue(type: keyof typeof ACTIVITY_UNITS, value: number): string {
  if (type === 'water') return value < 1 ? `${Math.round(value * 1000)} ml` : `${+value.toFixed(2)} L`;
  return `${Math.round(value)} ${ACTIVITY_UNITS[type]}`;
}

/** "+1.5", "-2", "±0" style signed delta, or "—" when unknown. */
export function formatDelta(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (value === 0) return '±0';
  const rounded = +value.toFixed(digits);
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

export function formatWeight(kg: number, system: 'metric' | 'imperial'): string {
  return system === 'imperial' ? `${kgToLbs(kg)} lbs` : `${+kg.toFixed(1)} kg`;
}

/** Parse a positive number from free text ("2,5" works too). */
export function parsePositive(input: string): number | null {
  const value = parseFloat(input.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}
